import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { BitacoraSchema } from "@/lib/validations";
import { calcularFechaLimiteBitacora } from "@/lib/bitacora-fechas";

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

// Bitácoras del propio aprendiz (evidencia c) — hasta 12, quincenales desde su fecha real de
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
    select: { fechaInicioEtapaProductiva: true },
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

  const fechaLimite = calcularFechaLimiteBitacora(aprendiz.fechaInicioEtapaProductiva, d.numero);

  // Cada actividad hereda el período de la bitácora (periodoDesde/periodoHasta) como su propia
  // fechaInicio/fechaFin — el formulario ya no las pide por separado, serían el mismo dato dos veces.
  const actividadFechaInicio = d.periodoDesde ? new Date(d.periodoDesde) : null;
  const actividadFechaFin = d.periodoHasta ? new Date(d.periodoHasta) : null;

  const actividadesData = d.actividades.map((a) => ({
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
