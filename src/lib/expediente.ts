import { prisma } from "@/lib/prisma";
import { calcularSeguimiento } from "@/lib/seguimiento-evidencias";
import { advertenciaPlazoCulminacion, plazoMaximoCulminacion } from "@/lib/plazo-culminacion";

// Expediente de la Etapa Productiva de un aprendiz (requisitos §3.4; guía GFPI-G-040 §9.5): todo su
// proceso en un solo lugar —datos, las seis evidencias con su aval, reuniones, novedades y avisos
// enviados—, para consultarlo en pantalla o guardarlo en PDF desde el navegador. Solo lectura.

const QUIEN = { select: { nombres: true, apellidos: true } } as const;

export async function cargarExpediente(userId: string) {
  const a = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      nombres: true,
      apellidos: true,
      tipoDocumento: true,
      cedula: true,
      email: true,
      celular: true,
      estado: true,
      fechaInicioEtapaProductiva: true,
      fechaFinEtapaProductiva: true,
      totalBitacoras: true,
      bitacoraInicioTramo: true,
      diasEjecutadosPrevios: true,
      fechaPorCertificar: true,
      porCertificarPor: QUIEN,
      fechaDesercion: true,
      motivoDesercion: true,
      declaradoDesertorPor: QUIEN,
      ficha: {
        select: {
          codigo: true,
          programa: true,
          fechaLimiteIniciarEP: true,
          fechaInicioProductiva: true,
          reglamento: true,
          instructor: { select: { nombres: true, apellidos: true, email: true } },
        },
      },
      companyProfile: {
        select: {
          empresaPatrocinadora: true,
          direccionEmpresa: true,
          nombreCoformador: true,
          cargoCoformador: true,
          correoCoformador: true,
          celularCoformador: true,
        },
      },
      seleccionesAlternativa: {
        select: {
          id: true,
          tipoSolicitud: true,
          fechaSolicitud: true,
          alternativa: true,
          subtipoAlternativa: true,
          fechaInicioEjecucion: true,
          fechaFinEjecucion: true,
          archivoUrl: true,
          estado: true,
          fechaAval: true,
          observacionesAval: true,
          requisitosOmitidos: true,
          registroSofiaPlus: true,
          avaladoPor: QUIEN,
        },
        orderBy: { createdAt: "asc" },
      },
      formalizacionEtapaProductiva: {
        select: {
          tipoDocumento: true,
          archivoUrl: true,
          fecha: true,
          estado: true,
          fechaAval: true,
          observaciones: true,
          avaladoPor: QUIEN,
        },
      },
      concertacionFuncion: {
        select: {
          fecha: true,
          horaInicio: true,
          horaFin: true,
          estado: true,
          fechaAval: true,
          observaciones: true,
          competenciasDesarrollar: true,
          resultadosAprendizaje: true,
          avaladoPor: QUIEN,
          variables: { select: { variable: true, valoracion: true, observaciones: true } },
        },
      },
      bitacoras: {
        select: {
          numero: true,
          periodoDesde: true,
          periodoHasta: true,
          fechaLimite: true,
          fechaEntrega: true,
          archivoUrl: true,
          estado: true,
          observaciones: true,
          fechaAval: true,
          avaladoPor: QUIEN,
        },
        orderBy: { numero: "asc" },
      },
      evaluaciones: {
        select: {
          id: true,
          numero: true,
          esExtraordinario: true,
          motivoExtraordinario: true,
          solicitadaPor: true,
          fecha: true,
          horaInicio: true,
          horaFin: true,
          modalidad: true,
          estado: true,
          observaciones: true,
          fechaAval: true,
          juicioFinal: true,
          retroalimentacionInstructor: true,
          retroalimentacionCoformador: true,
          retroalimentacionAprendiz: true,
          avaladoPor: QUIEN,
          variables: { select: { variable: true, categoria: true, valoracion: true, observaciones: true } },
        },
        orderBy: [{ numero: "asc" }, { fecha: "asc" }],
      },
      certificacionEmpresario: {
        select: {
          archivoUrl: true,
          fecha: true,
          estado: true,
          fechaAval: true,
          observaciones: true,
          avaladoPor: QUIEN,
        },
      },
      interrupcionesEP: {
        select: {
          alternativa: true,
          fechaInicioTramo: true,
          fechaInterrupcion: true,
          diasEjecutados: true,
          motivo: true,
          motivoDetalle: true,
          certificadoUrl: true,
          estado: true,
          fechaAval: true,
          observacionesAval: true,
          avaladoPor: QUIEN,
        },
        orderBy: { createdAt: "asc" },
      },
      aplazamientosEP: {
        select: {
          alternativa: true,
          fechaSuspension: true,
          fechaReanudacionPrevista: true,
          fechaReanudacionReal: true,
          diasEjecutados: true,
          motivo: true,
          motivoDetalle: true,
          soporteUrl: true,
          estado: true,
          fechaAval: true,
          actaComite: true,
          fechaActaComite: true,
          observacionesAval: true,
          avaladoPor: QUIEN,
        },
        orderBy: { createdAt: "asc" },
      },
      avisosPlazo: {
        select: { clave: true, tipo: true, fechaLimite: true, enviadoEn: true, destinatarios: true },
        orderBy: { enviadoEn: "asc" },
      },
    },
  });
  if (!a || a.role !== "APRENDIZ") return null;

  const momentos = a.evaluaciones.filter((e) => !e.esExtraordinario);
  const extraordinarias = a.evaluaciones.filter((e) => e.esExtraordinario);
  const ultimaAlternativa = a.seleccionesAlternativa.at(-1);

  // El mismo semáforo del panel de Seguimiento y de la insignia del aprendiz: un solo cálculo.
  const checklist = calcularSeguimiento({
    hoy: new Date(),
    fechaInicioEP: a.fechaInicioEtapaProductiva,
    fechaFinEP: a.fechaFinEtapaProductiva,
    fechaLimiteIniciarEPFicha: a.ficha?.fechaLimiteIniciarEP ?? null,
    alternativaAprobada: ultimaAlternativa?.estado === "APROBADA",
    formalizacionAprobada: a.formalizacionEtapaProductiva?.estado === "APROBADA",
    concertacionAprobada: a.concertacionFuncion?.estado === "APROBADA",
    bitacoras: a.bitacoras,
    totalBitacoras: a.totalBitacoras,
    bitacoraInicioTramo: a.bitacoraInicioTramo,
    estadoAprendiz: a.estado,
    evaluacion2Aprobada: momentos.some((e) => e.numero === 2 && e.estado === "APROBADA"),
    evaluacion3Aprobada: momentos.some((e) => e.numero === 3 && e.estado === "APROBADA"),
    certificacionAprobada: a.certificacionEmpresario?.estado === "APROBADA",
  });

  // Plazo de 24 meses del Acuerdo 007 de 2012, si la ficha se rige por él (solo advierte).
  const plazoCulminacion = plazoMaximoCulminacion(a.ficha);
  const advertenciaPlazo = advertenciaPlazoCulminacion({
    plazo: plazoCulminacion,
    fechaFin: a.fechaFinEtapaProductiva,
    hoy: new Date(),
    estado: a.estado,
  });

  return { ...a, momentos, extraordinarias, checklist, plazoCulminacion, advertenciaPlazo };
}

export type Expediente = NonNullable<Awaited<ReturnType<typeof cargarExpediente>>>;
