// Semáforo de cumplimiento de las 6 evidencias de Etapa Productiva, calculado por aprendiz a
// partir de su propia fecha de inicio/fin (User.fechaInicioEtapaProductiva/fechaFinEtapaProductiva
// — nunca de Ficha.fechaInicioProductiva, que es solo referencia institucional agregada), salvo
// la Alternativa EP, que por definición se diligencia ANTES de tener esa fecha propia: para ella
// se usa la única referencia disponible en ese momento, Ficha.fechaLimiteIniciarEP.
//
// Plazos oficiales confirmados con el usuario:
//   1. Alternativa EP y Formalización: inmediatamente al iniciar la Etapa Productiva.
//   2. Concertación (Momento 1): 15 días después de iniciar.
//   3. Bitácoras: cada 15 días, 12 en total por defecto — 6 si la Etapa Productiva es corta (ver
//      User.totalBitacoras; el cálculo de fechas está en src/lib/bitacora-fechas.ts).
//   4. Evaluaciones: Momento 2 al 50% del tiempo planeado (guía GFPI-G-040 §9.2); Momento 3,
//      10-15 días antes del cierre.
//   5. Certificación del empresario: hasta la fecha de fin de la Etapa Productiva.

import { calcularSlotsBitacoras } from "@/lib/bitacora-fechas";
import { detalleDetencionPlazos } from "@/lib/validations";
import type { EstadoEvidencia } from "@/generated/prisma/enums";

export const DIAS_ALERTA_PROXIMA = 5;
const DIAS_CONCERTACION = 15;

// Número de bitácoras avaladas con el que la evidencia se da por cumplida. Los dos totales
// válidos son 6 y 12 (ver `TotalBitacorasValues`), y cualquiera de los dos basta: llegar a seis
// ya cumple, aunque al aprendiz se le hayan planeado doce.
export const MIN_BITACORAS_CUMPLIMIENTO = 6;
const DIAS_MOMENTO3_ANTES_DE_CIERRE = 10;

export type EstadoSeguimiento = "completa" | "atrasada" | "proxima" | "pendiente";

export type ChecklistItem = {
  clave: "alternativa" | "formalizacion" | "concertacion" | "bitacoras" | "evaluaciones" | "certificacion";
  etiqueta: string;
  estado: EstadoSeguimiento;
  detalle: string;
  // null cuando todavía no existe un panel dedicado para esa evidencia (Concertación no tiene
  // página de revisión propia para el instructor aún) — el chip se muestra igual, solo que no
  // es clicable.
  href: string | null;
  // Cuántas piezas concretas están atrasadas dentro de este chip — 0 o 1 para los de un solo
  // punto (Alternativa, Formalización, Concertación, Certificación), la cuenta real de bitácoras
  // vencidas sin enviar, o hasta 2 para Evaluaciones (Momento 2 y Momento 3). Reutilizado tanto
  // por el panel de Seguimiento del instructor como por la insignia del nav del propio aprendiz
  // — un solo cálculo de fechas, dos consumidores, para no tener que repetir esta lógica.
  cantidadAtrasada: number;
};

function diffDias(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24));
}

// Momento 2 (Seguimiento): la guía GFPI-G-040 §9.2 lo ubica "al 50% del tiempo planeado", no en
// un día fijo. Mientras toda Etapa Productiva duraba seis meses, 60 días era una aproximación
// razonable a esa mitad; dejó de serlo cuando un tramo puede durar menos —el aprendiz que retoma
// tras interrumpir solo cumple el tiempo que le faltaba (ver `diasPendientesEtapaProductiva`)—,
// porque el día 60 de un tramo de 75 cae casi en el cierre. Se conserva el valor fijo solo como
// respaldo para cuando todavía no hay fecha fin definida.
export const DIAS_MOMENTO2_SIN_FECHA_FIN = 60;

function fechaMomento2(fechaInicioEP: Date | null, fechaFinEP: Date | null): Date | null {
  if (!fechaInicioEP) return null;
  if (!fechaFinEP || fechaFinEP.getTime() <= fechaInicioEP.getTime()) {
    return new Date(fechaInicioEP.getTime() + DIAS_MOMENTO2_SIN_FECHA_FIN * 86400000);
  }
  return new Date((fechaInicioEP.getTime() + fechaFinEP.getTime()) / 2);
}

// Un solo punto con fecha límite (Alternativa, Formalización, Concertación, Certificación):
// decide completa/atrasada/próxima/pendiente según si ya existe la evidencia aprobada y cuánto
// falta o ha pasado desde la referencia.
function estadoPorFecha(params: {
  hoy: Date;
  referencia: Date | null;
  completa: boolean;
}): { estado: EstadoSeguimiento; dias: number | null; sinReferencia: boolean } {
  const { hoy, referencia, completa } = params;
  if (completa) return { estado: "completa", dias: null, sinReferencia: false };
  if (!referencia) return { estado: "pendiente", dias: null, sinReferencia: true };

  const dias = diffDias(referencia, hoy);
  if (dias > 0) return { estado: "atrasada", dias, sinReferencia: false };
  if (dias >= -DIAS_ALERTA_PROXIMA) return { estado: "proxima", dias: -dias, sinReferencia: false };
  return { estado: "pendiente", dias: -dias, sinReferencia: false };
}

export function calcularSeguimiento(input: {
  hoy: Date;
  fechaInicioEP: Date | null;
  fechaFinEP: Date | null;
  fechaLimiteIniciarEPFicha: Date | null;
  alternativaAprobada: boolean;
  formalizacionAprobada: boolean;
  // Momento 1 ya valorado y avalado por el instructor. Antes esto se deducía de la puntualidad
  // (si la reunión se agendó dentro de los 15 días del inicio), pero eso dejaba la evidencia
  // "atrasada" para siempre a quien la hizo tarde: por completa que estuviera, nunca podía
  // llegar a "Por certificar". El retraso queda registrado en la fecha de la propia evidencia;
  // no tiene por qué convertirse en una deuda perpetua. Reportado en producción con un aprendiz
  // que tenía las seis evidencias avaladas y aun así aparecía con una evaluación pendiente.
  concertacionAprobada: boolean;
  bitacoras: { numero: number; estado: EstadoEvidencia }[];
  // 6 o 12 (ver User.totalBitacoras) — varía por aprendiz, no siempre son 12.
  totalBitacoras: number;
  // Número de bitácora con el que arranca el tramo vigente (1 si nunca interrumpió su EP).
  bitacoraInicioTramo?: number;
  // Estado del aprendiz (`EstadoAprendiz`). Interesa solo para saber si su reloj de plazos está
  // detenido — interrumpió, está aplazado o desertó (ver `detalleDetencionPlazos`).
  estadoAprendiz?: string;
  evaluacion2Aprobada: boolean;
  evaluacion3Aprobada: boolean;
  certificacionAprobada: boolean;
}): ChecklistItem[] {
  const { hoy, fechaInicioEP, fechaFinEP, fechaLimiteIniciarEPFicha } = input;

  const alternativa = estadoPorFecha({
    hoy,
    referencia: fechaLimiteIniciarEPFicha,
    completa: input.alternativaAprobada,
  });

  const formalizacion = estadoPorFecha({
    hoy,
    referencia: fechaInicioEP,
    completa: input.formalizacionAprobada,
  });

  const refConcertacion = fechaInicioEP
    ? new Date(fechaInicioEP.getTime() + DIAS_CONCERTACION * 86400000)
    : null;
  // Mismo criterio que las demás evidencias: completa cuando está avalada. Mientras no lo esté,
  // la referencia son los 15 días de §9.2 para decidir si va atrasada, próxima o a tiempo.
  const concertacion = estadoPorFecha({
    hoy,
    referencia: refConcertacion,
    completa: input.concertacionAprobada,
  });

  // Bitácoras: no es un único punto — se cuentan cuántas de las 12 ya vencieron sin quedar
  // aprobadas (incluye las rechazadas sin reenviar, porque siguen sin estar al día).
  let bitacoras: ChecklistItem;
  if (!fechaInicioEP) {
    bitacoras = {
      clave: "bitacoras",
      etiqueta: "Bitácoras",
      estado: "pendiente",
      detalle: "Sin fecha de inicio de EP",
      href: "/formulario/instructor/bitacoras",
      cantidadAtrasada: 0,
    };
  } else {
    const slots = calcularSlotsBitacoras(
      fechaInicioEP,
      input.totalBitacoras,
      input.bitacoraInicioTramo ?? 1,
    );
    const porNumero = new Map(input.bitacoras.map((b) => [b.numero, b]));
    let atrasadas = 0;
    let proxima = false;
    // Las de tramos anteriores ya entregadas cuentan como cumplidas para el total del programa.
    let aprobadas = input.bitacoras.filter(
      (b) => b.numero < (input.bitacoraInicioTramo ?? 1) && b.estado === "APROBADA",
    ).length;
    slots.forEach(({ numero, fechaLimite: limite }) => {
      const b = porNumero.get(numero);
      if (b?.estado === "APROBADA") {
        aprobadas++;
        return;
      }
      const alDia = b?.estado === "PENDIENTE";
      if (alDia) return;
      const dias = diffDias(limite, hoy);
      if (dias > 0) atrasadas++;
      else if (dias >= -DIAS_ALERTA_PROXIMA) proxima = true;
    });
    // Cumplimiento de bitácoras: se alcanza con 6 o con 12 (regla institucional), no con el total
    // exacto planeado. 12 es el estándar de una Etapa Productiva de seis meses y 6 el de una
    // corta, pero seis bitácoras avaladas ya dan por cumplida la evidencia — por eso el umbral es
    // el menor entre lo planeado y ese mínimo.
    //
    // Antes la condición era `aprobadas === totalBitacoras`, igualdad estricta. Eso tenía dos
    // efectos malos: un aprendiz que llegaba al mínimo pero no al total seguía sin poder
    // certificarse, y uno con MÁS bitácoras aprobadas que las planeadas (por ejemplo al corregirle
    // el total de 12 a 6) tampoco contaba como completo, porque nunca daba la igualdad exacta.
    const umbralCumplimiento = Math.min(input.totalBitacoras, MIN_BITACORAS_CUMPLIMIENTO);
    const todasAprobadas = aprobadas >= umbralCumplimiento;
    const estado: EstadoSeguimiento = todasAprobadas
      ? "completa"
      : atrasadas > 0
        ? "atrasada"
        : proxima
          ? "proxima"
          : "pendiente";
    // Cuando cumple con menos de las planeadas se dice explícitamente cuántas lleva: "Al día" a
    // secas haría pensar que entregó las doce, y el instructor necesita ver la diferencia.
    const detalle = todasAprobadas
      ? aprobadas < input.totalBitacoras
        ? `${aprobadas} de ${input.totalBitacoras} — cumple el mínimo`
        : "Al día"
      : atrasadas > 0
        ? `${atrasadas} bitácora${atrasadas === 1 ? "" : "s"} atrasada${atrasadas === 1 ? "" : "s"}`
        : proxima
          ? "Una bitácora vence pronto"
          : "Al día";
    bitacoras = {
      clave: "bitacoras",
      etiqueta: "Bitácoras",
      estado,
      detalle,
      href: "/formulario/instructor/bitacoras",
      // Ya cumplida la evidencia, los cupos que quedaron sin entregar dejan de ser una deuda: no
      // deben seguir sumando a la insignia roja del nav ni al conteo de atrasos del instructor.
      cantidadAtrasada: todasAprobadas ? 0 : atrasadas,
    };
  }

  const refMomento2 = fechaMomento2(fechaInicioEP, fechaFinEP);
  const momento2 = estadoPorFecha({ hoy, referencia: refMomento2, completa: input.evaluacion2Aprobada });

  const refMomento3 = fechaFinEP
    ? new Date(fechaFinEP.getTime() - DIAS_MOMENTO3_ANTES_DE_CIERRE * 86400000)
    : null;
  const momento3 = estadoPorFecha({ hoy, referencia: refMomento3, completa: input.evaluacion3Aprobada });

  const rango: EstadoSeguimiento[] = ["atrasada", "proxima", "pendiente", "completa"];
  const peorEvaluacion = [momento2, momento3].sort(
    (a, b) => rango.indexOf(a.estado) - rango.indexOf(b.estado)
  )[0];
  const evaluaciones: ChecklistItem = {
    clave: "evaluaciones",
    etiqueta: "Evaluaciones",
    estado: peorEvaluacion.estado,
    detalle:
      peorEvaluacion.estado === "completa"
        ? "Momentos 2 y 3 al día"
        : peorEvaluacion.sinReferencia
          ? "Aún no inicia su EP"
          : `Momento ${momento2.estado !== "completa" ? 2 : 3}${
              peorEvaluacion.estado === "atrasada"
                ? ` atrasado ${peorEvaluacion.dias}d`
                : ` vence en ${peorEvaluacion.dias}d`
            }`,
    href: "/formulario/instructor/evaluaciones",
    cantidadAtrasada:
      (momento2.estado === "atrasada" ? 1 : 0) + (momento3.estado === "atrasada" ? 1 : 0),
  };

  const certificacion = estadoPorFecha({ hoy, referencia: fechaFinEP, completa: input.certificacionAprobada });

  function detalleFecha(
    item: { estado: EstadoSeguimiento; dias: number | null; sinReferencia: boolean },
    sinReferenciaMsg: string
  ) {
    if (item.estado === "completa") return "Al día";
    if (item.estado === "atrasada") return `Atrasada ${item.dias}d`;
    if (item.estado === "proxima") return `Vence en ${item.dias}d`;
    if (item.sinReferencia) return sinReferenciaMsg;
    return `A tiempo · vence en ${item.dias}d`;
  }

  // Con el reloj de plazos detenido (interrupción, aplazamiento o deserción) lo que aún no está
  // avalado queda "pendiente" (no atrasado): el aprendiz no tiene cómo entregarlo hasta que
  // arranque el tramo siguiente, o ya salió del proceso. Lo ya cumplido se conserva como
  // completo — el histórico no se borra.
  function conPlazosDetenidos(items: ChecklistItem[]): ChecklistItem[] {
    const detalle =
      detalleDetencionPlazos[input.estadoAprendiz as keyof typeof detalleDetencionPlazos];
    if (!detalle) return items;
    return items.map((item) =>
      item.estado === "completa"
        ? item
        : { ...item, estado: "pendiente", detalle, cantidadAtrasada: 0 },
    );
  }

  return conPlazosDetenidos([
    {
      clave: "alternativa",
      etiqueta: "Alternativa EP",
      estado: alternativa.estado,
      detalle: detalleFecha(alternativa, "Sin fecha límite de la ficha"),
      href: "/formulario/instructor/alternativas",
      cantidadAtrasada: alternativa.estado === "atrasada" ? 1 : 0,
    },
    {
      clave: "formalizacion",
      etiqueta: "Formalización",
      estado: formalizacion.estado,
      detalle: detalleFecha(formalizacion, "Aún no inicia su EP"),
      href: "/formulario/instructor/formalizaciones",
      cantidadAtrasada: formalizacion.estado === "atrasada" ? 1 : 0,
    },
    {
      clave: "concertacion",
      etiqueta: "Concertación",
      estado: concertacion.estado,
      detalle: detalleFecha(concertacion, "Aún no inicia su EP"),
      href: null,
      cantidadAtrasada: concertacion.estado === "atrasada" ? 1 : 0,
    },
    bitacoras,
    evaluaciones,
    {
      clave: "certificacion",
      etiqueta: "Certificación",
      estado: certificacion.estado,
      detalle: detalleFecha(certificacion, "Aún no termina su EP"),
      href: "/formulario/instructor/certificacion",
      cantidadAtrasada: certificacion.estado === "atrasada" ? 1 : 0,
    },
  ]);
}
