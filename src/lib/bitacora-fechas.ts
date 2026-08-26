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
