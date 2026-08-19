import type { NivelFormacionValue } from "@/lib/validations";

// Reglas oficiales de cálculo de fechas de una ficha (confirmadas por el coordinador académico):
// - FECHA_INICIO FICHA y FECHA DE FIN DE FORMACIÓN se ingresan manualmente.
// - INICIO PRODUCTIVA se calcula desde FECHA_INICIO FICHA: +181 días calendario si el nivel de
//   formación es Técnico, +631 días calendario si es Tecnólogo.
// - LÍMITE PARA INICIAR EP se calcula desde FECHA DE FIN DE FORMACIÓN: +361 días calendario,
//   igual para Técnico y Tecnólogo.
// No hay regla definida para Auxiliar ni para fichas sin nivel de formación — en esos casos las
// fechas calculadas quedan en null (no se inventan valores).

const DIAS_INICIO_PRODUCTIVA: Partial<Record<NivelFormacionValue, number>> = {
  TECNICO: 181,
  TECNOLOGO: 631,
};

const DIAS_LIMITE_INICIAR_EP: Partial<Record<NivelFormacionValue, number>> = {
  TECNICO: 361,
  TECNOLOGO: 361,
};

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha.getTime());
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

export function calcularFechasFicha(datos: {
  nivelFormacion: NivelFormacionValue | null;
  fechaInicioFicha: Date | null;
  fechaFinFormacion: Date | null;
}): { fechaInicioProductiva: Date | null; fechaLimiteIniciarEP: Date | null } {
  const { nivelFormacion, fechaInicioFicha, fechaFinFormacion } = datos;

  const diasInicio = nivelFormacion ? DIAS_INICIO_PRODUCTIVA[nivelFormacion] : undefined;
  const fechaInicioProductiva =
    diasInicio !== undefined && fechaInicioFicha ? sumarDias(fechaInicioFicha, diasInicio) : null;

  const diasLimite = nivelFormacion ? DIAS_LIMITE_INICIAR_EP[nivelFormacion] : undefined;
  const fechaLimiteIniciarEP =
    diasLimite !== undefined && fechaFinFormacion ? sumarDias(fechaFinFormacion, diasLimite) : null;

  return { fechaInicioProductiva, fechaLimiteIniciarEP };
}
