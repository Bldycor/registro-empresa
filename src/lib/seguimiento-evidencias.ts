// Semáforo de cumplimiento de las 6 evidencias de Etapa Productiva, calculado por aprendiz a
// partir de su propia fecha de inicio/fin (User.fechaInicioEtapaProductiva/fechaFinEtapaProductiva
// — nunca de Ficha.fechaInicioProductiva, que es solo referencia institucional agregada), salvo
// la Alternativa EP, que por definición se diligencia ANTES de tener esa fecha propia: para ella
// se usa la única referencia disponible en ese momento, Ficha.fechaLimiteIniciarEP.
//
// Plazos oficiales confirmados con el usuario:
//   1. Alternativa EP y Formalización: inmediatamente al iniciar la Etapa Productiva.
//   2. Concertación (Momento 1): 15 días después de iniciar.
//   3. Bitácoras: cada 15 días, 12 en total (ya cubierto por src/lib/bitacora-fechas.ts).
//   4. Evaluaciones: Momento 2 a los ~2 meses (60 días); Momento 3, 10-15 días antes del cierre.
//   5. Certificación del empresario: hasta la fecha de fin de la Etapa Productiva.

import { calcularFechasLimiteBitacoras } from "@/lib/bitacora-fechas";
import type { EstadoEvidencia } from "@/generated/prisma/enums";

export const DIAS_ALERTA_PROXIMA = 5;
const DIAS_CONCERTACION = 15;
const DIAS_MOMENTO2 = 60;
const DIAS_MOMENTO3_ANTES_DE_CIERRE = 10;

export type EstadoSeguimiento = "completa" | "atrasada" | "proxima" | "pendiente";

export type ChecklistItem = {
  clave: "alternativa" | "formalizacion" | "concertacion" | "bitacoras" | "evaluaciones" | "certificacion";
  etiqueta: string;
  estado: EstadoSeguimiento;
  detalle: string;
  // null cuando todavía no existe un panel dedicado para esa evidencia (Concertación y
  // Certificación no tienen página de revisión propia para el instructor aún) — el chip se
  // muestra igual, solo que no es clicable.
  href: string | null;
};

function diffDias(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24));
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
  concertacionAgendada: boolean;
  bitacoras: { numero: number; estado: EstadoEvidencia }[];
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
  const concertacion = estadoPorFecha({
    hoy,
    referencia: refConcertacion,
    completa: input.concertacionAgendada,
  });

  // Bitácoras: no es un único punto — se cuentan cuántas de las 12 ya vencieron sin quedar
  // aprobadas (incluye las rechazadas sin reenviar, porque siguen sin estar al día).
  let bitacoras: ChecklistItem;
  if (!fechaInicioEP) {
    bitacoras = { clave: "bitacoras", etiqueta: "Bitácoras", estado: "pendiente", detalle: "Sin fecha de inicio de EP", href: "/formulario/instructor/bitacoras" };
  } else {
    const fechasLimite = calcularFechasLimiteBitacoras(fechaInicioEP);
    const porNumero = new Map(input.bitacoras.map((b) => [b.numero, b]));
    let atrasadas = 0;
    let proxima = false;
    fechasLimite.forEach((limite, idx) => {
      const numero = idx + 1;
      const b = porNumero.get(numero);
      const alDia = b?.estado === "APROBADA" || b?.estado === "PENDIENTE";
      if (alDia) return;
      const dias = diffDias(limite, hoy);
      if (dias > 0) atrasadas++;
      else if (dias >= -DIAS_ALERTA_PROXIMA) proxima = true;
    });
    const estado: EstadoSeguimiento = atrasadas > 0 ? "atrasada" : proxima ? "proxima" : "pendiente";
    const detalle =
      atrasadas > 0
        ? `${atrasadas} bitácora${atrasadas === 1 ? "" : "s"} atrasada${atrasadas === 1 ? "" : "s"}`
        : proxima
          ? "Una bitácora vence pronto"
          : "Al día";
    bitacoras = { clave: "bitacoras", etiqueta: "Bitácoras", estado, detalle, href: "/formulario/instructor/bitacoras" };
  }

  const refMomento2 = fechaInicioEP ? new Date(fechaInicioEP.getTime() + DIAS_MOMENTO2 * 86400000) : null;
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

  return [
    {
      clave: "alternativa",
      etiqueta: "Alternativa EP",
      estado: alternativa.estado,
      detalle: detalleFecha(alternativa, "Sin fecha límite de la ficha"),
      href: "/formulario/instructor/alternativas",
    },
    {
      clave: "formalizacion",
      etiqueta: "Formalización",
      estado: formalizacion.estado,
      detalle: detalleFecha(formalizacion, "Aún no inicia su EP"),
      href: "/formulario/instructor/formalizaciones",
    },
    {
      clave: "concertacion",
      etiqueta: "Concertación",
      estado: concertacion.estado,
      detalle: detalleFecha(concertacion, "Aún no inicia su EP"),
      href: null,
    },
    bitacoras,
    evaluaciones,
    {
      clave: "certificacion",
      etiqueta: "Certificación",
      estado: certificacion.estado,
      detalle: detalleFecha(certificacion, "Aún no termina su EP"),
      href: null,
    },
  ];
}
