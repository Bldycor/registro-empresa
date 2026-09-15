import { fechaEnColombia } from "@/lib/plazos-institucionales";

// Plazo máximo para culminar la etapa productiva (guía GFPI-G-040 §9.1.1 c): los grupos que se
// rigen por el Acuerdo 007 de 2012 tienen 24 meses desde el fin de la etapa lectiva, que en la
// ficha es la fecha «Inicio productiva». Los del Acuerdo 009 de 2024 no tienen este plazo, y una
// ficha sin reglamento marcado no lo calcula (decisión de Coordinación, 15 sep 2026).
//
// Por decisión de Coordinación el plazo solo ADVIERTE: no bloquea ningún aval ni suma como causal
// de deserción.

export const MESES_PLAZO_ACUERDO_007 = 24;

export function plazoMaximoCulminacion(
  ficha: { reglamento: string | null; fechaInicioProductiva: Date | null } | null | undefined,
): Date | null {
  if (!ficha || ficha.reglamento !== "ACUERDO_007_2012" || !ficha.fechaInicioProductiva) return null;
  const plazo = new Date(ficha.fechaInicioProductiva);
  plazo.setUTCMonth(plazo.getUTCMonth() + MESES_PLAZO_ACUERDO_007);
  return plazo;
}

// Un proceso que ya terminó la etapa productiva (o que se cerró) no tiene nada que advertir.
const PROCESO_TERMINADO = new Set(["POR_CERTIFICAR", "CERTIFICADO", "DESERTADO"]);

// Texto de la advertencia, o null si no hay nada que advertir:
// - el plazo ya venció y el proceso sigue abierto;
// - la fecha fin (la propuesta en una alternativa, o la vigente del aprendiz) cae después del plazo.
// Las fechas son días de calendario guardados a medianoche UTC; "hoy" es el día en Colombia.
export function advertenciaPlazoCulminacion(input: {
  plazo: Date | null;
  fechaFin: Date | null;
  hoy: Date;
  estado?: string | null;
}): string | null {
  if (!input.plazo || (input.estado && PROCESO_TERMINADO.has(input.estado))) return null;
  const plazo = input.plazo.toISOString().slice(0, 10);
  const texto = input.plazo.toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  if (fechaEnColombia(input.hoy) > plazo) {
    return `Venció el plazo de 24 meses para culminar la etapa productiva (${texto}, Acuerdo 007 de 2012).`;
  }
  if (input.fechaFin && input.fechaFin.toISOString().slice(0, 10) > plazo) {
    return `La etapa productiva terminaría después del plazo máximo de 24 meses (${texto}, Acuerdo 007 de 2012).`;
  }
  return null;
}
