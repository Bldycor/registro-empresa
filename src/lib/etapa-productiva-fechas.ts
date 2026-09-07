// Cálculo automático de la fecha de inicio/fin de Etapa Productiva de UN aprendiz, al momento de
// crear su cuenta (individual o por importación masiva) — el usuario no las escribe a mano, el
// sistema las deriva de la fecha institucional de la ficha (`Ficha.fechaInicioProductiva`).
// Duración fija de 6 meses (180 días), la misma que ya asume `bitacora-fechas.ts` (12 bitácoras
// quincenales = 180 días). Si la ficha todavía no tiene esa fecha, quedan sin definir — el
// instructor las corrige después, individualmente o para toda la ficha a la vez.

export const DURACION_ETAPA_PRODUCTIVA_DIAS = 180;

export function calcularFechaFinEtapaProductiva(fechaInicio: Date): Date {
  return new Date(fechaInicio.getTime() + DURACION_ETAPA_PRODUCTIVA_DIAS * 24 * 60 * 60 * 1000);
}

export function calcularFechasEtapaProductivaDesdeFicha(fechaInicioProductivaFicha: Date | null): {
  fechaInicioEtapaProductiva: Date | null;
  fechaFinEtapaProductiva: Date | null;
} {
  if (!fechaInicioProductivaFicha) {
    return { fechaInicioEtapaProductiva: null, fechaFinEtapaProductiva: null };
  }
  return {
    fechaInicioEtapaProductiva: fechaInicioProductivaFicha,
    fechaFinEtapaProductiva: calcularFechaFinEtapaProductiva(fechaInicioProductivaFicha),
  };
}

// Reglas de negocio al corregir la fecha de inicio (individual o por ficha): no puede pasar la
// fecha límite institucional para iniciar EP de la ficha (`fechaLimiteIniciarEP`); y no puede ser
// anterior a la fecha calculada de la ficha (`fechaInicioProductiva`) — salvo la alternativa
// Vínculo laboral, que sí puede arrancar hasta 3 meses antes (el vínculo laboral ya existía).
export const VINCULO_LABORAL_DIAS_ANTICIPO = 90;

function formatoFechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString("es-CO", { timeZone: "UTC" });
}

export function fechaMinimaInicioEtapaProductiva(
  fechaInicioProductivaFicha: Date | null,
  esVinculoLaboral: boolean,
): Date | null {
  if (!fechaInicioProductivaFicha) return null;
  if (!esVinculoLaboral) return fechaInicioProductivaFicha;
  return new Date(
    fechaInicioProductivaFicha.getTime() - VINCULO_LABORAL_DIAS_ANTICIPO * 24 * 60 * 60 * 1000,
  );
}

export function validarFechaInicioEtapaProductiva({
  fechaInicioPropuesta,
  fechaInicioProductivaFicha,
  fechaLimiteIniciarEPFicha,
  esVinculoLaboral,
}: {
  fechaInicioPropuesta: Date;
  fechaInicioProductivaFicha: Date | null;
  fechaLimiteIniciarEPFicha: Date | null;
  esVinculoLaboral: boolean;
}): string | null {
  const minima = fechaMinimaInicioEtapaProductiva(fechaInicioProductivaFicha, esVinculoLaboral);
  if (minima && fechaInicioPropuesta < minima) {
    return esVinculoLaboral
      ? `Con Vínculo laboral, la fecha de inicio no puede ser anterior a ${formatoFechaCorta(minima)} (hasta ${VINCULO_LABORAL_DIAS_ANTICIPO / 30} meses antes de la fecha calculada de la ficha).`
      : `La fecha de inicio no puede ser anterior a ${formatoFechaCorta(minima)} (fecha calculada de la ficha) — solo se puede corregir hacia una fecha posterior, salvo con la alternativa Vínculo laboral.`;
  }
  if (fechaLimiteIniciarEPFicha && fechaInicioPropuesta > fechaLimiteIniciarEPFicha) {
    return `La fecha de inicio no puede ser posterior a ${formatoFechaCorta(fechaLimiteIniciarEPFicha)} (límite institucional para iniciar Etapa Productiva de esta ficha).`;
  }
  return null;
}
