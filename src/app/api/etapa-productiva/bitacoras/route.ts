import { NextResponse } from "next/server";
import { catalogoDelAprendiz, problemaEnCompetencia } from "@/lib/competencias-validas";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { BitacoraSchema } from "@/lib/validations";
import { calcularFechaLimiteBitacora } from "@/lib/bitacora-fechas";
import { type ActividadLeida } from "@/lib/leer-gfpi147";
import { leerBitacoraDeUrl } from "@/lib/leer-bitacora-url";
import { competenciaDelCatalogo } from "@/lib/competencia-catalogo";

// Las actividades se toman del PDF adjunto, no de lo que llegue del formulario (9 nov 2026): el
// aprendiz las ve leídas, confirma que son las de este período y las envía; si algo está mal,
// corrige su archivo y lo vuelve a adjuntar. Así lo enviado coincide siempre con el documento
// firmado, y no se cuelan las actividades de la bitácora anterior.
const SIN_ACTIVIDADES =
  "SEPA no pudo leer las actividades de tu bitácora. Adjunta el PDF exportado de la plantilla GFPI-F-147 (no una foto ni un escaneo), con la tabla de actividades diligenciada.";

async function actividadesDelAdjunto(archivoUrl: string): Promise<ActividadLeida[]> {
  return (await leerBitacoraDeUrl(archivoUrl)).actividades ?? [];
}

const BITACORA_SELECT = {
  id: true,
  numero: true,
  periodoDesde: true,
  periodoHasta: true,
  fechaLimite: true,
  fechaEntrega: true,
  archivoUrl: true,
  arlAfiliado: true,
  arlNivelRiesgo: true,
  arlRiesgoCorresponde: true,
  arlTieneEPP: true,
  estado: true,
  observaciones: true,
  fechaAval: true,
  actividades: {
    select: {
      id: true,
      descripcion: true,
      competencias: true,
      fechaInicio: true,
      fechaFin: true,
      evidenciaCumplimiento: true,
      observaciones: true,
    },
  },
} as const;

// Bitácoras del propio aprendiz (evidencia c) — seis, una por mes, desde su fecha real de
// inicio de Etapa Productiva.
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const bitacoras = await prisma.bitacora.findMany({
    where: { userId: user.id },
    select: BITACORA_SELECT,
    orderBy: { numero: "asc" },
  });

  return NextResponse.json({ bitacoras });
}

// Crea o reemplaza la bitácora número `numero` del aprendiz (upsert por [userId, numero]). Solo
// disponible si ya tiene fecha real de inicio de Etapa Productiva (evidencia (a) aprobada) — sin
// eso no hay como calcular la fecha límite oficial.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = BitacoraSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const aprendiz = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fechaInicioEtapaProductiva: true, totalBitacoras: true },
  });
  if (!aprendiz?.fechaInicioEtapaProductiva) {
    return NextResponse.json(
      {
        error: {
          _root: [
            "Todavía no tienes fecha de inicio de Etapa Productiva definida — debes tener aprobada la Selección de Alternativa primero.",
          ],
        },
      },
      { status: 409 }
    );
  }
  if (d.numero > aprendiz.totalBitacoras) {
    return NextResponse.json(
      {
        error: {
          _root: [
            `Tu Etapa Productiva solo tiene ${aprendiz.totalBitacoras} bitácoras — la número ${d.numero} no aplica.`,
          ],
        },
      },
      { status: 400 },
    );
  }

  const delPdf = await actividadesDelAdjunto(d.archivoUrl);
  if (delPdf.length === 0) {
    return NextResponse.json({ error: { _root: [SIN_ACTIVIDADES] } }, { status: 400 });
  }

  // La competencia de cada actividad sale del catálogo que cargó Coordinación (2 oct 2026): la del
  // PDF si coincide con una del catálogo; si no, la que el aprendiz eligió de la lista.
  const catalogo = await catalogoDelAprendiz(user.id);
  const listaCatalogo = [...catalogo.competenciaDe].map(([resultadoAprendizaje, nombreCompetencia]) => ({
    id: resultadoAprendizaje,
    tipo: "TECNICA" as const,
    nombreCompetencia,
    resultadoAprendizaje,
  }));
  const actividades = delPdf.map((a, i) => ({
    descripcion: a.descripcion,
    competencias: competenciaDelCatalogo(a.competencias, listaCatalogo) || d.actividades[i]?.competencias || null,
    evidenciaCumplimiento: a.evidenciaCumplimiento,
    observaciones: a.observaciones,
  }));
  const guardadas = await prisma.bitacoraActividad.findMany({
    where: { bitacora: { userId: user.id, numero: d.numero } },
    select: { competencias: true },
  });
  const yaGuardadas = new Set(guardadas.map((g) => g.competencias?.trim()).filter((c): c is string => !!c));
  for (const a of actividades) {
    const problema = problemaEnCompetencia(catalogo, a.competencias, yaGuardadas);
    if (problema) {
      return NextResponse.json({ error: { _root: [problema] } }, { status: 400 });
    }
  }

  const fechaLimite = calcularFechaLimiteBitacora(
    aprendiz.fechaInicioEtapaProductiva,
    d.numero,
    aprendiz.totalBitacoras,
  );

  // Cada actividad hereda el período de la bitácora (periodoDesde/periodoHasta) como su propia
  // fechaInicio/fechaFin — el formulario ya no las pide por separado, serían el mismo dato dos veces.
  const actividadFechaInicio = d.periodoDesde ? new Date(d.periodoDesde) : null;
  const actividadFechaFin = d.periodoHasta ? new Date(d.periodoHasta) : null;

  const actividadesData = actividades.map((a) => ({
    descripcion: a.descripcion,
    competencias: a.competencias || null,
    fechaInicio: actividadFechaInicio,
    fechaFin: actividadFechaFin,
    evidenciaCumplimiento: a.evidenciaCumplimiento || null,
    observaciones: a.observaciones || null,
  }));

  const bitacora = await prisma.bitacora.upsert({
    where: { userId_numero: { userId: user.id, numero: d.numero } },
    create: {
      userId: user.id,
      numero: d.numero,
      periodoDesde: d.periodoDesde ? new Date(d.periodoDesde) : null,
      periodoHasta: d.periodoHasta ? new Date(d.periodoHasta) : null,
      fechaLimite,
      fechaEntrega: new Date(),
      archivoUrl: d.archivoUrl,
      arlAfiliado: d.arlAfiliado ?? null,
      arlNivelRiesgo: d.arlNivelRiesgo ?? null,
      arlRiesgoCorresponde: d.arlRiesgoCorresponde ?? null,
      arlTieneEPP: d.arlTieneEPP ?? null,
      actividades: { create: actividadesData },
    },
    update: {
      periodoDesde: d.periodoDesde ? new Date(d.periodoDesde) : null,
      periodoHasta: d.periodoHasta ? new Date(d.periodoHasta) : null,
      fechaLimite,
      fechaEntrega: new Date(),
      archivoUrl: d.archivoUrl,
      arlAfiliado: d.arlAfiliado ?? null,
      arlNivelRiesgo: d.arlNivelRiesgo ?? null,
      arlRiesgoCorresponde: d.arlRiesgoCorresponde ?? null,
      arlTieneEPP: d.arlTieneEPP ?? null,
      estado: "PENDIENTE",
      avaladoPorId: null,
      fechaAval: null,
      observaciones: null,
      actividades: { deleteMany: {}, create: actividadesData },
    },
    select: BITACORA_SELECT,
  });

  return NextResponse.json({ bitacora }, { status: 201 });
}
