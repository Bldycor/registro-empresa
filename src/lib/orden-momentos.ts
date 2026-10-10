import { prisma } from "@/lib/prisma";

// Orden de los momentos (decisión de Coordinación, 9 oct 2026): un momento solo se agenda, se
// registra o se finaliza si el anterior ya fue evaluado por el instructor. El Momento 2 necesita el
// Momento 1 (Concertación) avalado, y el Momento 3 necesita el Momento 2 evaluado.
// Pasó con un aprendiz que hizo el Momento 3 cuando todavía no tenía el 2.

export async function momentoAnteriorEvaluado(
  userId: string,
  numero: 2 | 3,
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const evaluado =
    numero === 2
      ? (await prisma.concertacionFuncion.findUnique({ where: { userId }, select: { estado: true } }))?.estado === "APROBADA"
      : (
          await prisma.evaluacion.findFirst({
            where: { userId, numero: 2, esExtraordinario: false },
            select: { estado: true },
          })
        )?.estado === "APROBADA";
  if (evaluado) return { ok: true };
  return { ok: false, mensaje: mensajeOrden(numero) };
}

export function mensajeOrden(numero: 2 | 3): string {
  const anterior = numero === 2 ? "Momento 1 (Concertación)" : "Momento 2 (Seguimiento)";
  return `El Momento ${numero} se hace cuando el instructor ya evaluó el ${anterior}. Primero debe quedar evaluado ese momento.`;
}
