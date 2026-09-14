// Fecha límite oficial de cada bitácora (formato GFPI-F-147), calculada desde la fecha real de
// inicio de Etapa Productiva del aprendiz (`User.fechaInicioEtapaProductiva`, sincronizada desde
// la evidencia (a) aprobada) — nunca desde `Ficha.fechaInicioProductiva`, que es solo referencia
// institucional agregada.
import { DURACION_ETAPA_PRODUCTIVA_DIAS } from "@/lib/etapa-productiva-fechas";

export const TOTAL_BITACORAS = 12;

// Las bitácoras se reparten a lo largo de TODO el período de práctica, así que el intervalo sale
// de dividir ese período entre cuántas son: 12 → una cada 15 días (quincenal), 6 → una cada 30
// días (mensual, una por mes hasta cumplir el período).
//
// Antes el intervalo estaba fijo en 15 días para cualquier total. A quien tenía 6 bitácoras se le
// vencían las seis dentro de los primeros tres meses, y el resto de la práctica quedaba sin
// ninguna fecha — con el efecto de mostrarle todo atrasado a mitad de camino.
export function diasEntreBitacoras(total: number = TOTAL_BITACORAS): number {
  return Math.max(1, Math.round(DURACION_ETAPA_PRODUCTIVA_DIAS / Math.max(1, total)));
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha.getTime());
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

export function calcularFechaLimiteBitacora(
  fechaInicioEP: Date,
  numero: number,
  total: number = TOTAL_BITACORAS,
): Date {
  return sumarDias(fechaInicioEP, diasEntreBitacoras(total) * numero);
}

export function calcularFechasLimiteBitacoras(
  fechaInicioEP: Date,
  total: number = TOTAL_BITACORAS
): Date[] {
  return Array.from({ length: total }, (_, i) =>
    calcularFechaLimiteBitacora(fechaInicioEP, i + 1, total),
  );
}

// Período que le corresponde a cada bitácora (para sugerirlo por defecto en el formulario,
// editable por el aprendiz): desde el límite de la bitácora anterior (o la fecha de inicio de EP,
// en la primera) hasta el límite de esta. Quincenal o mensual según cuántas sean en total.
export function calcularPeriodoBitacora(
  fechaInicioEP: Date,
  numero: number,
  numeroInicialTramo: number = 1,
  total: number = TOTAL_BITACORAS,
): { desde: Date; hasta: Date } {
  const posicion = numero - numeroInicialTramo + 1;
  return {
    desde:
      posicion <= 1
        ? fechaInicioEP
        : calcularFechaLimiteBitacora(fechaInicioEP, posicion - 1, total),
    hasta: calcularFechaLimiteBitacora(fechaInicioEP, posicion, total),
  };
}

// Bitácoras del tramo VIGENTE de Etapa Productiva. Cuando el aprendiz interrumpió su práctica y
// la retomó con otra alternativa (guía GFPI-G-040 §9.3.1), la numeración NO se reinicia: las
// anteriores a `numeroInicialTramo` ya se entregaron en el tramo previo y conservan la fecha
// límite con la que se crearon; de ahí en adelante la cadencia se recalcula desde la nueva fecha
// de inicio. Sin interrupciones (`numeroInicialTramo` = 1) el resultado es 1..total desde el
// inicio, con el intervalo que corresponda al total.
export function calcularSlotsBitacoras(
  fechaInicioEP: Date,
  total: number = TOTAL_BITACORAS,
  numeroInicialTramo: number = 1
): { numero: number; fechaLimite: Date }[] {
  const inicio = Math.min(Math.max(1, numeroInicialTramo), total);
  return Array.from({ length: total - inicio + 1 }, (_, i) => ({
    numero: inicio + i,
    fechaLimite: calcularFechaLimiteBitacora(fechaInicioEP, i + 1, total),
  }));
}
