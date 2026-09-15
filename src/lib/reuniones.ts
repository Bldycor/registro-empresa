import type { Prisma } from "@/generated/prisma/client";

// Qué evaluaciones ocupan una franja del instructor: los Momentos siempre, y las reuniones
// extraordinarias mientras no estén rechazadas. Una extraordinaria rechazada libera su horario.
// Un solo criterio para los tres lugares que revisan choques de horario: la agenda de los
// Momentos 2 y 3, la disponibilidad que ve el aprendiz y la agenda de extraordinarias.
export const ocupaFranja: Prisma.EvaluacionWhereInput = {
  OR: [{ esExtraordinario: false }, { estado: { not: "RECHAZADA" } }],
};
