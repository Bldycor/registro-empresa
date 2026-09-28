import { prisma } from "@/lib/prisma";
import { diasCalendarioEntre, fechaEnColombia } from "@/lib/plazos-institucionales";
import {
  PLAZO_MAXIMO_PLAN_MEJORAMIENTO_DIAS,
  estadoPlanMejoramientoLabel,
  type EstadoPlanMejoramientoValue,
} from "@/lib/validations";

// Plan de mejoramiento (guía GFPI-G-040 §9.4; reglamento del aprendiz, Acuerdo 009 de 2024).
//
// Medida formativa académica cuando el aprendiz no supera resultados de aprendizaje en cualquiera
// de los tres Momentos de evaluación, agotados los dos llamados de atención previos. Lo elabora el
// instructor, lo firman el aprendiz y el coordinador académico —esa firma es la suscripción, y en
// SEPA equivale a la autorización de Coordinación— y lo verifica el instructor. No requiere acta.
//
// Todo lo que mide este archivo ADVIERTE, no bloquea: un plan vencido o no cumplido no es causal
// de deserción ni impide certificar (decisión de Coordinación, 24 sep 2026). El instructor puede
// abrir un segundo plan si el caso lo amerita.

export type PlanItem = {
  id: string;
  momento: number;
  estado: EstadoPlanMejoramientoValue;
  estadoLabel: string;
  resultadosNoSuperados: string;
  actividades: string;
  evidencias: string;
  llamadosPrevios: string;
  diasPlazo: number;
  // Día de calendario; solo existe desde que Coordinación autoriza.
  fechaLimite: Date | null;
  fechaAutorizacion: Date | null;
  observacionesCoordinacion: string | null;
  fechaCierre: Date | null;
  verificacion: string | null;
  soporteUrl: string | null;
  creadoPor: string | null;
  autorizadoPor: string | null;
  cerradoPor: string | null;
  creadoEn: Date;
  // Días que faltan para la fecha límite (negativo si ya pasó). null mientras no esté autorizado
  // o si el plan ya se cerró: ahí el plazo dejó de correr.
  diasRestantes: number | null;
  vencido: boolean;
  // El plan sigue abierto: se cuenta como pendiente en el panel y en «Por certificar».
  abierto: boolean;
  aprendiz: { id: string; nombre: string; cedula: string; ficha: string | null };
};

const MS_DIA = 24 * 60 * 60 * 1000;

// Día de calendario a medianoche UTC, que es como se guardan las fechas sin hora en SEPA.
function diaUTC(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

// La suscripción es la autorización del coordinador: de ahí arrancan los días calendario. El
// Acuerdo 009 pone dos topes — 20 días y la fecha final de la fase —, así que la fecha límite es
// la menor de las dos. Si la etapa productiva termina antes, el plan se recorta hasta ese día.
export function calcularFechaLimite(params: {
  autorizadoEn: Date;
  diasPlazo: number;
  finEtapaProductiva: Date | null;
}): { fechaLimite: Date; recortadaPorFinEP: boolean } {
  const dias = Math.min(params.diasPlazo, PLAZO_MAXIMO_PLAN_MEJORAMIENTO_DIAS);
  const propuesta = diaUTC(fechaEnColombia(params.autorizadoEn));
  propuesta.setUTCDate(propuesta.getUTCDate() + dias);

  const fin = params.finEtapaProductiva;
  if (fin && fin.getTime() < propuesta.getTime()) {
    return { fechaLimite: fin, recortadaPorFinEP: true };
  }
  return { fechaLimite: propuesta, recortadaPorFinEP: false };
}

// Días que faltan (o que ya se pasaron) frente a la fecha límite, en días de Colombia.
function diasRestantes(fechaLimite: Date, hoy: Date): number {
  const hoyUTC = diaUTC(fechaEnColombia(hoy));
  const diferencia = fechaLimite.getTime() - hoyUTC.getTime();
  return diferencia >= 0
    ? diasCalendarioEntre(hoyUTC, fechaLimite)
    : -Math.round(Math.abs(diferencia) / MS_DIA);
}

export function estaAbierto(estado: EstadoPlanMejoramientoValue): boolean {
  return estado === "POR_AUTORIZAR" || estado === "VIGENTE" || estado === "DEVUELTO";
}

const APRENDIZ_SELECT = {
  id: true,
  nombres: true,
  apellidos: true,
  cedula: true,
  ficha: { select: { codigo: true } },
} as const;

const PLAN_SELECT = {
  id: true,
  momento: true,
  estado: true,
  resultadosNoSuperados: true,
  actividades: true,
  evidencias: true,
  llamadosPrevios: true,
  diasPlazo: true,
  fechaLimite: true,
  fechaAutorizacion: true,
  observacionesCoordinacion: true,
  fechaCierre: true,
  verificacion: true,
  soporteUrl: true,
  createdAt: true,
  creadoPor: { select: { nombres: true, apellidos: true } },
  autorizadoPor: { select: { nombres: true, apellidos: true } },
  cerradoPor: { select: { nombres: true, apellidos: true } },
  user: { select: APRENDIZ_SELECT },
} as const;

type PlanConsultado = {
  id: string;
  momento: number;
  estado: string;
  resultadosNoSuperados: string;
  actividades: string;
  evidencias: string;
  llamadosPrevios: string;
  diasPlazo: number;
  fechaLimite: Date | null;
  fechaAutorizacion: Date | null;
  observacionesCoordinacion: string | null;
  fechaCierre: Date | null;
  verificacion: string | null;
  soporteUrl: string | null;
  createdAt: Date;
  creadoPor: { nombres: string; apellidos: string } | null;
  autorizadoPor: { nombres: string; apellidos: string } | null;
  cerradoPor: { nombres: string; apellidos: string } | null;
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    ficha: { codigo: string } | null;
  };
};

function nombre(p: { nombres: string; apellidos: string } | null): string | null {
  return p ? `${p.nombres} ${p.apellidos}` : null;
}

function aItem(p: PlanConsultado, hoy: Date): PlanItem {
  const estado = p.estado as EstadoPlanMejoramientoValue;
  const abierto = estaAbierto(estado);
  // El plazo solo corre entre la autorización y el cierre.
  const restantes = p.fechaLimite && abierto ? diasRestantes(p.fechaLimite, hoy) : null;

  return {
    id: p.id,
    momento: p.momento,
    estado,
    estadoLabel: estadoPlanMejoramientoLabel[estado],
    resultadosNoSuperados: p.resultadosNoSuperados,
    actividades: p.actividades,
    evidencias: p.evidencias,
    llamadosPrevios: p.llamadosPrevios,
    diasPlazo: p.diasPlazo,
    fechaLimite: p.fechaLimite,
    fechaAutorizacion: p.fechaAutorizacion,
    observacionesCoordinacion: p.observacionesCoordinacion,
    fechaCierre: p.fechaCierre,
    verificacion: p.verificacion,
    soporteUrl: p.soporteUrl,
    creadoPor: nombre(p.creadoPor),
    autorizadoPor: nombre(p.autorizadoPor),
    cerradoPor: nombre(p.cerradoPor),
    creadoEn: p.createdAt,
    diasRestantes: restantes,
    vencido: restantes !== null && restantes < 0,
    abierto,
    aprendiz: {
      id: p.user.id,
      nombre: `${p.user.nombres} ${p.user.apellidos}`,
      cedula: p.user.cedula,
      ficha: p.user.ficha?.codigo ?? null,
    },
  };
}

// `userId` trae los de un aprendiz; `instructorId`, los de los aprendices de sus fichas; sin
// filtro, todos (Coordinación y Admin).
export async function cargarPlanes(
  filtro: { userId?: string; instructorId?: string } = {},
  hoy: Date = new Date(),
): Promise<PlanItem[]> {
  const user = filtro.userId
    ? { id: filtro.userId }
    : filtro.instructorId
      ? { role: "APRENDIZ" as const, ficha: { instructorId: filtro.instructorId } }
      : undefined;

  const planes = await prisma.planMejoramiento.findMany({
    where: user ? { user } : {},
    select: PLAN_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return planes.map((p) => aItem(p, hoy));
}

// Advertencia para «Por certificar»: los planes que siguen abiertos o que se cerraron como no
// cumplidos. No impide nada; solo se muestra (decisión de Coordinación, 24 sep 2026).
export async function advertenciasPlanMejoramiento(userId: string): Promise<string[]> {
  const planes = await prisma.planMejoramiento.findMany({
    where: { userId, estado: { in: ["POR_AUTORIZAR", "VIGENTE", "DEVUELTO", "NO_CUMPLIDO"] } },
    select: { estado: true, momento: true },
  });

  return planes.map((p) => {
    const estado = p.estado as EstadoPlanMejoramientoValue;
    return estado === "NO_CUMPLIDO"
      ? `Tiene un plan de mejoramiento del Momento ${p.momento} cerrado como no cumplido.`
      : `Tiene un plan de mejoramiento del Momento ${p.momento} sin cerrar (${estadoPlanMejoramientoLabel[estado].toLowerCase()}).`;
  });
}
