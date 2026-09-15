import { prisma } from "@/lib/prisma";
import { superaTope, TOPE_APRENDICES_POR_INSTRUCTOR } from "@/lib/tope-instructor";

// Carga de aprendices de cada instructor frente al tope de la guía (ver `tope-instructor.ts`).

// Aprendices en curso (estado Activo) de las fichas de cada instructor. Los que están en pausa
// (interrumpida, aplazada) o ya terminaron no cuentan: no están ejecutando la etapa productiva.
export async function aprendicesActivosPorInstructor(instructorIds: string[]): Promise<Map<string, number>> {
  const conteo = new Map<string, number>(instructorIds.map((id) => [id, 0]));
  if (instructorIds.length === 0) return conteo;
  const fichas = await prisma.ficha.findMany({
    where: { instructorId: { in: instructorIds } },
    select: {
      instructorId: true,
      _count: { select: { aprendices: { where: { role: "APRENDIZ", estado: "ACTIVO" } } } },
    },
  });
  for (const f of fichas) {
    if (f.instructorId) conteo.set(f.instructorId, (conteo.get(f.instructorId) ?? 0) + f._count.aprendices);
  }
  return conteo;
}

// Advertencias para los instructores dados (los que acaban de recibir fichas o aprendices), ya
// redactadas con su nombre. Vacío si ninguno supera el tope.
export async function advertenciasTope(instructorIds: string[]): Promise<string[]> {
  const ids = Array.from(new Set(instructorIds.filter(Boolean)));
  if (ids.length === 0) return [];
  const [conteo, instructores] = await Promise.all([
    aprendicesActivosPorInstructor(ids),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, nombres: true, apellidos: true } }),
  ]);
  return instructores
    .filter((i) => superaTope(conteo.get(i.id) ?? 0))
    .map(
      (i) =>
        `${i.nombres} ${i.apellidos} queda con ${conteo.get(i.id)} aprendices activos: supera el tope de ${TOPE_APRENDICES_POR_INSTRUCTOR} por instructor (guía GFPI-G-040 §9.1.3).`,
    );
}
