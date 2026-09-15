// Tope de aprendices por instructor de seguimiento (guía GFPI-G-040 §9.1.3): con la programación
// de 160 horas al mes, como máximo 80 aprendices que estén ejecutando la etapa productiva. Por
// decisión de Coordinación el tope solo ADVIERTE: la asignación se hace igual.
//
// Vive aparte de `carga-instructor.ts` (que consulta la base) para poder usarse en el navegador.
export const TOPE_APRENDICES_POR_INSTRUCTOR = 80;

export function superaTope(cantidad: number): boolean {
  return cantidad > TOPE_APRENDICES_POR_INSTRUCTOR;
}
