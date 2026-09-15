import { prisma } from "@/lib/prisma";
import { fechaEnColombia, ZONA_HORARIA_COLOMBIA } from "@/lib/plazos-institucionales";
import type { HorarioReunion } from "@/lib/citacion-correo";
import { getVideoConferenceUrl } from "@/lib/video";
import {
  destinatariosReunion,
  prefijoSalaReunion,
  tituloReunion,
  type TipoReunion,
} from "@/lib/reuniones";

// Recordatorio antes de cada reunión (requisito §3.2). Lo envía la misma tarea diaria de los
// avisos de plazo (8 a. m. de Colombia):
// - lo normal es que salga el día anterior;
// - si la reunión se agendó o se movió después de la tarea del día anterior, sale el mismo día,
//   siempre que todavía no haya empezado.
// Uno por reunión y horario: el registro queda en `AvisoPlazo` con tipo RECORDATORIO_REUNION. Si
// la reunión se reprograma, su nueva fecha u hora tiene su propio recordatorio.

export type RecordatorioReunion = {
  userId: string;
  clave: string;
  // Día de la reunión, a medianoche UTC (así se guardan las fechas de calendario).
  fecha: Date;
  cuando: "hoy" | "manana";
  aprendizNombre: string;
  titulo: string;
  horario: HorarioReunion;
  videollamadaUrl: string;
  detalle: string | null;
  destinatarios: string[];
};

export const claveRecordatorio = (reunionId: string, horaInicio: string) =>
  `reunion:${reunionId}@${horaInicio}`;

function diaSiguiente(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// "HH:mm" en Colombia.
function horaEnColombia(ahora: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_HORARIA_COLOMBIA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ahora);
}

const APRENDIZ_SELECT = {
  nombres: true,
  apellidos: true,
  email: true,
  ficha: { select: { instructor: { select: { email: true } } } },
  companyProfile: { select: { correoCoformador: true } },
} as const;

export async function recordatoriosPendientes(ahora: Date): Promise<RecordatorioReunion[]> {
  const hoy = fechaEnColombia(ahora);
  const horaActual = horaEnColombia(ahora);
  const fechas = [hoy, diaSiguiente(hoy)].map((f) => new Date(`${f}T00:00:00.000Z`));
  // Un proceso cerrado ya no tiene reuniones que recordar.
  const procesoAbierto = { estado: { notIn: ["CERTIFICADO" as const, "DESERTADO" as const] } };

  const [concertaciones, evaluaciones] = await Promise.all([
    prisma.concertacionFuncion.findMany({
      // Con la valoración finalizada, la reunión ya se hizo.
      where: { fecha: { in: fechas }, estado: { not: "APROBADA" }, user: procesoAbierto },
      select: {
        id: true,
        userId: true,
        fecha: true,
        horaInicio: true,
        horaFin: true,
        videollamadaUrl: true,
        user: { select: APRENDIZ_SELECT },
      },
    }),
    prisma.evaluacion.findMany({
      where: {
        fecha: { in: fechas },
        user: procesoAbierto,
        // Los Momentos mientras el instructor no los finalice; las extraordinarias, solo aprobadas.
        OR: [
          { esExtraordinario: false, numero: { in: [2, 3] }, estado: { not: "APROBADA" } },
          { esExtraordinario: true, estado: "APROBADA" },
        ],
      },
      select: {
        id: true,
        userId: true,
        numero: true,
        esExtraordinario: true,
        motivoExtraordinario: true,
        fecha: true,
        horaInicio: true,
        horaFin: true,
        videollamadaUrl: true,
        user: { select: APRENDIZ_SELECT },
      },
    }),
  ]);

  const candidatos = [
    ...concertaciones.map((c) => ({
      ...c,
      tipo: "CONCERTACION" as TipoReunion,
      numero: 1,
      esExtraordinario: false,
      motivoExtraordinario: null as string | null,
    })),
    ...evaluaciones.map((e) => ({ ...e, tipo: "EVALUACION" as TipoReunion })),
  ]
    .filter(
      (r): r is typeof r & { fecha: Date; horaInicio: string; horaFin: string } =>
        Boolean(r.fecha && r.horaInicio && r.horaFin),
    )
    // Una reunión de hoy que ya empezó no necesita recordatorio.
    .filter((r) => !(r.fecha.toISOString().slice(0, 10) === hoy && r.horaInicio <= horaActual));

  if (candidatos.length === 0) return [];

  const yaEnviados = await prisma.avisoPlazo.findMany({
    where: {
      tipo: "RECORDATORIO_REUNION",
      clave: { in: candidatos.map((r) => claveRecordatorio(r.id, r.horaInicio)) },
    },
    select: { clave: true, fechaLimite: true },
  });
  const enviados = new Set(yaEnviados.map((a) => `${a.clave}|${a.fechaLimite.toISOString()}`));

  return candidatos
    .filter((r) => !enviados.has(`${claveRecordatorio(r.id, r.horaInicio)}|${r.fecha.toISOString()}`))
    .map((r) => {
      const fecha = r.fecha.toISOString().slice(0, 10);
      return {
        userId: r.userId,
        clave: claveRecordatorio(r.id, r.horaInicio),
        fecha: r.fecha,
        cuando: fecha === hoy ? ("hoy" as const) : ("manana" as const),
        aprendizNombre: `${r.user.nombres} ${r.user.apellidos}`,
        titulo: tituloReunion(r.tipo, r.numero, r.esExtraordinario),
        horario: { fecha, horaInicio: r.horaInicio, horaFin: r.horaFin },
        videollamadaUrl:
          r.videollamadaUrl ?? getVideoConferenceUrl(r.id, prefijoSalaReunion(r.tipo, r.esExtraordinario)),
        detalle: r.motivoExtraordinario,
        destinatarios: destinatariosReunion({
          tipo: r.tipo,
          aprendizEmail: r.user.email,
          instructorEmail: r.user.ficha?.instructor?.email,
          coformadorEmail: r.user.companyProfile?.correoCoformador,
        }),
      };
    })
    .sort((a, b) =>
      a.horario.fecha === b.horario.fecha
        ? a.horario.horaInicio.localeCompare(b.horario.horaInicio)
        : a.horario.fecha.localeCompare(b.horario.fecha),
    );
}
