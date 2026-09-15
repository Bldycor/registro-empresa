import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { esCorreoValido } from "@/lib/citacion-correo";

// Qué evaluaciones ocupan una franja del instructor: los Momentos siempre, y las reuniones
// extraordinarias mientras no estén rechazadas. Una extraordinaria rechazada libera su horario.
// Un solo criterio para los lugares que revisan choques de horario: la agenda de los Momentos 2 y
// 3, la disponibilidad que ve el aprendiz, la agenda de extraordinarias y la reprogramación que
// hace el instructor (`franjasOcupadasInstructor`).
export const ocupaFranja: Prisma.EvaluacionWhereInput = {
  OR: [{ esExtraordinario: false }, { estado: { not: "RECHAZADA" } }],
};

// En qué tabla vive la reunión: la Concertación (Momento 1) tiene su propio modelo; los Momentos
// 2 y 3 y las reuniones extraordinarias son `Evaluacion`.
export type TipoReunion = "CONCERTACION" | "EVALUACION";

// Nombre de la reunión en correos, invitaciones y eventos de calendario.
export function tituloReunion(tipo: TipoReunion, numero: number, esExtraordinario: boolean): string {
  if (tipo === "CONCERTACION") return "Concertación de funciones";
  if (esExtraordinario) return "Reunión extraordinaria";
  return numero === 2 ? "Evaluación de seguimiento (Momento 2)" : "Evaluación de cierre (Momento 3)";
}

// Prefijo de la sala Jitsi de respaldo (ver `getVideoConferenceUrl`): el mismo que usa cada ruta
// al crear la reunión, para que el enlace de respaldo no cambie.
export function prefijoSalaReunion(tipo: TipoReunion, esExtraordinario: boolean): string {
  if (tipo === "CONCERTACION") return "ConcertacionFunciones";
  return esExtraordinario ? "Extraordinaria" : "Evaluacion";
}

// Correo de Coordinación que recibe las citaciones de la Concertación.
export function correoCoordinacionCitaciones(): string {
  return process.env.CITACION_EMAIL || "bcoba@sena.edu.co";
}

// Quiénes reciben la citación de una reunión, sus reprogramaciones y su recordatorio: Coordinación
// solo en la Concertación; instructor, aprendiz y coformador siempre. Sin repetidos y sin
// direcciones mal escritas, que harían fallar el envío entero.
export function destinatariosReunion(p: {
  tipo: TipoReunion;
  aprendizEmail: string;
  instructorEmail: string | null | undefined;
  coformadorEmail: string | null | undefined;
}): string[] {
  const lista = [
    p.tipo === "CONCERTACION" ? correoCoordinacionCitaciones() : null,
    p.instructorEmail,
    p.aprendizEmail,
    p.coformadorEmail,
  ];
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const correo of lista) {
    const limpio = (correo ?? "").trim();
    if (!limpio || !esCorreoValido(limpio) || vistos.has(limpio.toLowerCase())) continue;
    vistos.add(limpio.toLowerCase());
    resultado.push(limpio);
  }
  return resultado;
}

// Franjas que ya tiene ocupadas un instructor un día dado: los Momentos y extraordinarias de sus
// aprendices y las concertaciones de sus aprendices. Una Concertación, además, no puede cruzarse
// con ninguna otra concertación, sea de la ficha que sea, porque Coordinación las acompaña todas.
// `excluirId` deja fuera la reunión que se está moviendo.
export async function franjasOcupadasInstructor(p: {
  instructorId: string;
  fecha: Date;
  tipo: TipoReunion;
  excluirId?: string | null;
}): Promise<{ horaInicio: string; horaFin: string }[]> {
  const sinLaPropia = p.excluirId ? { id: { not: p.excluirId } } : {};
  const [evaluaciones, concertaciones] = await Promise.all([
    prisma.evaluacion.findMany({
      where: {
        fecha: p.fecha,
        user: { ficha: { instructorId: p.instructorId } },
        AND: [ocupaFranja],
        ...sinLaPropia,
      },
      select: { horaInicio: true, horaFin: true },
    }),
    prisma.concertacionFuncion.findMany({
      where: {
        fecha: p.fecha,
        ...(p.tipo === "CONCERTACION" ? {} : { user: { ficha: { instructorId: p.instructorId } } }),
        ...sinLaPropia,
      },
      select: { horaInicio: true, horaFin: true },
    }),
  ]);
  return [...evaluaciones, ...concertaciones]
    .filter((r): r is { horaInicio: string; horaFin: string } => Boolean(r.horaInicio && r.horaFin))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}
