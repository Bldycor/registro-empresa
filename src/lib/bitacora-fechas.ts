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
  numero: number,
  numeroInicialTramo: number = 1
): { desde: Date; hasta: Date } {
  const posicion = numero - numeroInicialTramo + 1;
  return {
    desde:
      posicion <= 1
        ? fechaInicioEP
        : calcularFechaLimiteBitacora(fechaInicioEP, posicion - 1),
    hasta: calcularFechaLimiteBitacora(fechaInicioEP, posicion),
  };
}

// Bitácoras del tramo VIGENTE de Etapa Productiva. Cuando el aprendiz interrumpió su práctica y
// la retomó con otra alternativa (guía GFPI-G-040 §9.3.1), la numeración NO se reinicia: las
// anteriores a `numeroInicialTramo` ya se entregaron en el tramo previo y conservan la fecha
// límite con la que se crearon; de ahí en adelante la cadencia quincenal se recalcula desde la
// nueva fecha de inicio. Sin interrupciones (`numeroInicialTramo` = 1) el resultado es idéntico
// al de siempre: 1..total cada 15 días desde el inicio.
export function calcularSlotsBitacoras(
  fechaInicioEP: Date,
  total: number = TOTAL_BITACORAS,
  numeroInicialTramo: number = 1
): { numero: number; fechaLimite: Date }[] {
  const inicio = Math.min(Math.max(1, numeroInicialTramo), total);
  return Array.from({ length: total - inicio + 1 }, (_, i) => ({
    numero: inicio + i,
    fechaLimite: calcularFechaLimiteBitacora(fechaInicioEP, i + 1),
  }));
}
