import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { EstadoAprendiz } from "@/generated/prisma/enums";
import { calcularSeguimiento, type ChecklistItem } from "@/lib/seguimiento-evidencias";
import { evaluarRiesgoDesercion } from "@/lib/desercion";
import { plazoBitacoraNovedad, plazoRegistroNovedad } from "@/lib/novedades";
import { advertenciaPlazoCulminacion, plazoMaximoCulminacion } from "@/lib/plazo-culminacion";
import { aprendicesActivosPorInstructor } from "@/lib/carga-instructor";
import { superaTope } from "@/lib/tope-instructor";
import { fechaEnColombia } from "@/lib/plazos-institucionales";
import { estadoAprendizLabel } from "@/lib/validations";

// Consultas y reportes (requisitos §3.5). Una sola consulta alimenta los tres reportes, que se
// reparten la información para no repetirla:
// - Métricas: solo totales.
// - Cumplimiento: cómo va cada evidencia en conjunto, y quiénes están en riesgo y por qué.
// - Listado: una fila por aprendiz con su avance.
// Los mismos filtros aplican a los tres, en pantalla y en el Excel. Todo es de solo consulta: el
// instructor ve a todos los aprendices y Coordinación también (requisitos §3.5).

export type FiltrosReporte = {
  ficha: string;
  instructor: string;
  empresa: string;
  estado: string;
  // Rango sobre la fecha de inicio de la Etapa Productiva, "YYYY-MM-DD".
  desde: string;
  hasta: string;
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function leerFiltros(
  fuente: URLSearchParams | Record<string, string | string[] | undefined>,
): FiltrosReporte {
  const valor = (k: string): string => {
    const v = fuente instanceof URLSearchParams ? fuente.get(k) : fuente[k];
    return (Array.isArray(v) ? v[0] : (v ?? "")).trim();
  };
  const estado = valor("estado");
  const desde = valor("desde");
  const hasta = valor("hasta");
  return {
    ficha: valor("ficha"),
    instructor: valor("instructor"),
    empresa: valor("empresa"),
    estado: estado in estadoAprendizLabel ? estado : "",
    desde: FECHA.test(desde) ? desde : "",
    hasta: FECHA.test(hasta) ? hasta : "",
  };
}

// Los filtros activos como query string, para el enlace del Excel.
export function filtrosAQuery(f: FiltrosReporte): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v);
  return q.toString();
}

const ETIQUETA_EVIDENCIA: Record<ChecklistItem["clave"], string> = {
  alternativa: "Alternativa EP",
  formalizacion: "Formalización",
  concertacion: "Concertación (Momento 1)",
  bitacoras: "Bitácoras",
  evaluaciones: "Evaluaciones (Momentos 2 y 3)",
  certificacion: "Certificación del empresario",
};

function estadoMomento(ev: { estado: string; juicioFinal?: string | null } | undefined, finalizado: string): string {
  if (!ev) return "Sin agendar";
  if (ev.estado !== "APROBADA") return "Agendado";
  if (ev.juicioFinal === "APROBADO") return `${finalizado} · Aprobado`;
  if (ev.juicioFinal === "NO_APROBADO") return `${finalizado} · No aprobado`;
  return finalizado;
}

const estadoCertificacion: Record<string, string> = {
  APROBADA: "Aprobada",
  PENDIENTE: "En revisión",
  RECHAZADA: "Rechazada",
};

export async function construirReporte(f: FiltrosReporte) {
  const ficha: Prisma.FichaWhereInput = {
    ...(f.ficha ? { codigo: f.ficha } : {}),
    ...(f.instructor ? { instructorId: f.instructor } : {}),
  };
  const where: Prisma.UserWhereInput = {
    role: "APRENDIZ",
    ...(Object.keys(ficha).length ? { ficha } : {}),
    ...(f.estado ? { estado: f.estado as EstadoAprendiz } : {}),
    ...(f.empresa ? { companyProfile: { empresaPatrocinadora: f.empresa } } : {}),
    ...(f.desde || f.hasta
      ? {
          fechaInicioEtapaProductiva: {
            ...(f.desde ? { gte: new Date(`${f.desde}T00:00:00.000Z`) } : {}),
            ...(f.hasta ? { lte: new Date(`${f.hasta}T00:00:00.000Z`) } : {}),
          },
        }
      : {}),
  };

  const [aprendices, fichas, instructores, empresas] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        tipoDocumento: true,
        cedula: true,
        estado: true,
        fechaInicioEtapaProductiva: true,
        fechaFinEtapaProductiva: true,
        totalBitacoras: true,
        bitacoraInicioTramo: true,
        ficha: {
          select: {
            codigo: true,
            programa: true,
            fechaLimiteIniciarEP: true,
            fechaFinFormacion: true,
            fechaInicioProductiva: true,
            reglamento: true,
            instructor: { select: { nombres: true, apellidos: true } },
          },
        },
        companyProfile: { select: { empresaPatrocinadora: true } },
        seleccionesAlternativa: { select: { estado: true }, orderBy: { createdAt: "desc" }, take: 1 },
        formalizacionEtapaProductiva: { select: { estado: true } },
        concertacionFuncion: { select: { estado: true, fecha: true } },
        bitacoras: { select: { numero: true, estado: true, fechaLimite: true, fechaEntrega: true } },
        evaluaciones: {
          where: { numero: { in: [2, 3] }, esExtraordinario: false },
          select: { numero: true, estado: true, juicioFinal: true, variables: { select: { valoracion: true } } },
        },
        certificacionEmpresario: { select: { estado: true } },
        // Novedades de la guía §9.2, con sus dos plazos (ver src/lib/novedades.ts).
        novedadesEP: { select: { fechaHecho: true, createdAt: true, fechaAnotacionBitacora: true } },
        interrupcionesEP: { select: { fechaInterrupcion: true, createdAt: true } },
        aplazamientosEP: { select: { fechaSuspension: true, createdAt: true } },
      },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
    prisma.ficha.findMany({
      where: { aprendices: { some: {} } },
      select: { codigo: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
    prisma.companyProfile.findMany({
      where: { user: { role: "APRENDIZ" } },
      distinct: ["empresaPatrocinadora"],
      select: { empresaPatrocinadora: true },
      orderBy: { empresaPatrocinadora: "asc" },
    }),
  ]);

  const hoy = new Date();

  const porEstado = Object.fromEntries(Object.keys(estadoAprendizLabel).map((k) => [k, 0])) as Record<string, number>;
  const bitacoras = { entregadas: 0, aTiempo: 0, conAtraso: 0, aprobadas: 0 };
  const momento3 = { aprobados: 0, noAprobados: 0 };
  const novedades = { total: 0, fueraDePlazo: 0, sinAnotarEnBitacora: 0 };
  let conAdvertenciaPlazo = 0;
  const rubrica = { valoradas: 0, satisfactorio: 0 };
  const matriz = Object.fromEntries(
    (Object.keys(ETIQUETA_EVIDENCIA) as ChecklistItem["clave"][]).map((clave) => [
      clave,
      { clave, etiqueta: ETIQUETA_EVIDENCIA[clave], completa: 0, atrasada: 0, proxima: 0, pendiente: 0 },
    ]),
  ) as Record<ChecklistItem["clave"], { clave: string; etiqueta: string; completa: number; atrasada: number; proxima: number; pendiente: number }>;
  const enRiesgo: {
    id: string;
    nombre: string;
    ficha: string | null;
    instructor: string | null;
    atrasadas: string[];
    causaDesercion: string | null;
  }[] = [];

  const listado = aprendices.map((a) => {
    const nombre = `${a.nombres} ${a.apellidos}`;
    const instructor = a.ficha?.instructor ? `${a.ficha.instructor.nombres} ${a.ficha.instructor.apellidos}` : null;
    const m2 = a.evaluaciones.find((e) => e.numero === 2);
    const m3 = a.evaluaciones.find((e) => e.numero === 3);

    const checklist = calcularSeguimiento({
      hoy,
      fechaInicioEP: a.fechaInicioEtapaProductiva,
      fechaFinEP: a.fechaFinEtapaProductiva,
      fechaLimiteIniciarEPFicha: a.ficha?.fechaLimiteIniciarEP ?? null,
      alternativaAprobada: a.seleccionesAlternativa[0]?.estado === "APROBADA",
      formalizacionAprobada: a.formalizacionEtapaProductiva?.estado === "APROBADA",
      concertacionAprobada: a.concertacionFuncion?.estado === "APROBADA",
      bitacoras: a.bitacoras,
      totalBitacoras: a.totalBitacoras,
      bitacoraInicioTramo: a.bitacoraInicioTramo,
      estadoAprendiz: a.estado,
      evaluacion2Aprobada: m2?.estado === "APROBADA",
      evaluacion3Aprobada: m3?.estado === "APROBADA",
      certificacionAprobada: a.certificacionEmpresario?.estado === "APROBADA",
    });
    const riesgo = evaluarRiesgoDesercion({
      hoy,
      estado: a.estado,
      fechaFinFormacionFicha: a.ficha?.fechaFinFormacion ?? null,
      concertacionFecha: a.concertacionFuncion?.fecha ?? null,
      practicaInterrumpida: a.estado === "PRACTICA_INTERRUMPIDA",
    });

    // Métricas.
    porEstado[a.estado] = (porEstado[a.estado] ?? 0) + 1;
    for (const b of a.bitacoras) {
      if (b.estado === "APROBADA") bitacoras.aprobadas++;
      if (!b.fechaEntrega) continue;
      bitacoras.entregadas++;
      // A tiempo = entregada a más tardar el día límite, contado en Colombia.
      if (fechaEnColombia(b.fechaEntrega) <= b.fechaLimite.toISOString().slice(0, 10)) bitacoras.aTiempo++;
      else bitacoras.conAtraso++;
    }
    if (m3?.juicioFinal === "APROBADO") momento3.aprobados++;
    if (m3?.juicioFinal === "NO_APROBADO") momento3.noAprobados++;
    for (const ev of a.evaluaciones) {
      for (const v of ev.variables) {
        if (!v.valoracion) continue;
        rubrica.valoradas++;
        if (v.valoracion === "SATISFACTORIO") rubrica.satisfactorio++;
      }
    }

    // Novedades (§9.2): las propias y las que la guía también cuenta como novedad.
    const novedadesAprendiz = [
      ...a.novedadesEP.map((n) => ({
        registro: plazoRegistroNovedad(n.fechaHecho, n.createdAt),
        sinAnotar: !n.fechaAnotacionBitacora,
        bitacora: plazoBitacoraNovedad(n.fechaHecho, n.fechaAnotacionBitacora, hoy),
      })),
      ...a.interrupcionesEP.map((i) => ({
        registro: plazoRegistroNovedad(i.fechaInterrupcion, i.createdAt),
        sinAnotar: false,
        bitacora: null,
      })),
      ...a.aplazamientosEP.map((ap) => ({
        registro: plazoRegistroNovedad(ap.fechaSuspension, ap.createdAt),
        sinAnotar: false,
        bitacora: null,
      })),
    ];
    const novedadesFueraDePlazo = novedadesAprendiz.filter((n) => n.registro?.vencido).length;
    const novedadesSinAnotar = novedadesAprendiz.filter((n) => n.sinAnotar).length;
    novedades.total += novedadesAprendiz.length;
    novedades.fueraDePlazo += novedadesFueraDePlazo;
    novedades.sinAnotarEnBitacora += novedadesSinAnotar;

    // Plazo de 24 meses del Acuerdo 007 (solo advertencia, ver src/lib/plazo-culminacion.ts).
    const advertenciaPlazo = advertenciaPlazoCulminacion({
      plazo: plazoMaximoCulminacion(a.ficha),
      fechaFin: a.fechaFinEtapaProductiva,
      hoy,
      estado: a.estado,
    });
    if (advertenciaPlazo) conAdvertenciaPlazo++;

    // Cumplimiento.
    for (const c of checklist) matriz[c.clave][c.estado]++;
    const atrasadas = checklist.filter((c) => c.estado === "atrasada").map((c) => `${ETIQUETA_EVIDENCIA[c.clave]}: ${c.detalle}`);
    if (atrasadas.length > 0 || riesgo.enRiesgo) {
      enRiesgo.push({ id: a.id, nombre, ficha: a.ficha?.codigo ?? null, instructor, atrasadas, causaDesercion: riesgo.causa });
    }

    // Listado.
    return {
      id: a.id,
      nombre,
      documento: `${a.tipoDocumento ?? ""} ${a.cedula}`.trim(),
      ficha: a.ficha?.codigo ?? null,
      programa: a.ficha?.programa ?? null,
      empresa: a.companyProfile?.empresaPatrocinadora ?? null,
      instructor,
      estado: estadoAprendizLabel[a.estado],
      inicioEP: a.fechaInicioEtapaProductiva,
      finEP: a.fechaFinEtapaProductiva,
      bitacorasAprobadas: a.bitacoras.filter((b) => b.estado === "APROBADA").length,
      totalBitacoras: a.totalBitacoras,
      novedades: novedadesAprendiz.length,
      novedadesFueraDePlazo,
      novedadesSinAnotar,
      advertenciaPlazo,
      momento1: a.concertacionFuncion ? (a.concertacionFuncion.estado === "APROBADA" ? "Valorado" : "Agendado") : "Sin agendar",
      momento2: estadoMomento(m2, "Evaluado"),
      momento3: estadoMomento(m3, "Evaluado"),
      certificacion: a.certificacionEmpresario ? estadoCertificacion[a.certificacionEmpresario.estado] : "Sin cargar",
    };
  });

  // Tope de 80 aprendices activos por instructor (§9.1.3): indicador institucional, no del filtro.
  const activosPorInstructor = await aprendicesActivosPorInstructor(instructores.map((i) => i.id));
  const instructoresSobreTope = instructores.filter((i) => superaTope(activosPorInstructor.get(i.id) ?? 0)).length;

  // Primero quien tiene más evidencias atrasadas; la causal de deserción desempata.
  enRiesgo.sort(
    (x, y) => y.atrasadas.length - x.atrasadas.length || Number(Boolean(y.causaDesercion)) - Number(Boolean(x.causaDesercion)),
  );

  return {
    generado: hoy,
    filtros: f,
    opciones: {
      fichas: fichas.map((x) => x.codigo),
      instructores: instructores.map((i) => ({ id: i.id, nombre: `${i.nombres} ${i.apellidos}` })),
      empresas: empresas.map((e) => e.empresaPatrocinadora),
    },
    metricas: {
      aprendices: aprendices.length,
      porEstado: Object.entries(porEstado).map(([estado, cantidad]) => ({
        estado,
        etiqueta: estadoAprendizLabel[estado as keyof typeof estadoAprendizLabel],
        cantidad,
      })),
      bitacoras,
      momento3,
      rubrica,
      novedades,
      alertas: { plazo24Meses: conAdvertenciaPlazo, instructoresSobreTope },
    },
    cumplimiento: { porEvidencia: Object.values(matriz), enRiesgo },
    listado,
  };
}

export type Reporte = Awaited<ReturnType<typeof construirReporte>>;

// Los filtros activos en palabras, para el encabezado de la pantalla y la hoja de Métricas.
export function describirFiltros(r: Reporte): string {
  const f = r.filtros;
  const partes = [
    f.ficha && `Ficha ${f.ficha}`,
    f.instructor && `Instructor: ${r.opciones.instructores.find((i) => i.id === f.instructor)?.nombre ?? "—"}`,
    f.empresa && `Empresa: ${f.empresa}`,
    f.estado && `Estado: ${estadoAprendizLabel[f.estado as keyof typeof estadoAprendizLabel]}`,
    (f.desde || f.hasta) &&
      ["Inicio de EP", f.desde && `desde ${f.desde}`, f.hasta && `hasta ${f.hasta}`].filter(Boolean).join(" "),
  ].filter(Boolean);
  return partes.length ? partes.join(" · ") : "Sin filtros";
}

// Porcentaje entero, o "—" cuando no hay base para calcularlo.
export function porcentaje(parte: number, total: number): string {
  return total > 0 ? `${Math.round((parte * 100) / total)} %` : "—";
}
