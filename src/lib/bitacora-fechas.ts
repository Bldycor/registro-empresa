// Fecha límite oficial de cada bitácora (formato GFPI-F-147): quincenal desde la fecha real de
// inicio de Etapa Productiva del aprendiz (`User.fechaInicioEtapaProductiva`, sincronizada desde
// la evidencia (a) aprobada) — nunca desde `Ficha.fechaInicioProductiva`, que es solo referencia
// institucional agregada. Van 12 bitácoras, cada 15 días calendario.
export const TOTAL_BITACORAS = 12;

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha.getTime());
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

export function calcularFechaLimiteBitacora(fechaInicioEP: Date, numero: number): Date {
  return sumarDias(fechaInicioEP, 15 * numero);
}

export function calcularFechasLimiteBitacoras(
  fechaInicioEP: Date,
  total: number = TOTAL_BITACORAS
): Date[] {
  return Array.from({ length: total }, (_, i) => calcularFechaLimiteBitacora(fechaInicioEP, i + 1));
}

// Período quincenal que le corresponde a cada bitácora (para sugerirlo por defecto en el
// formulario, editable por el aprendiz): desde el límite de la bitácora anterior (o la fecha de
// inicio de EP, en la primera) hasta el límite de esta bitácora.
export function calcularPeriodoBitacora(
  fechaInicioEP: Date,
  numero: number
): { desde: Date; hasta: Date } {
  return {
    desde: numero === 1 ? fechaInicioEP : calcularFechaLimiteBitacora(fechaInicioEP, numero - 1),
    hasta: calcularFechaLimiteBitacora(fechaInicioEP, numero),
  };
}
