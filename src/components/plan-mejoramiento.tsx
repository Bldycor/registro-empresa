"use client";

import { useEffect, useState } from "react";
import { formatoMomento } from "@/lib/plazos-institucionales";
import type { EstadoPlanMejoramientoValue } from "@/lib/validations";

// Plan de mejoramiento (guía GFPI-G-040 §9.4; reglamento del aprendiz, Acuerdo 009 de 2024).
// Presentación compartida por los tres paneles: el del instructor, el de Coordinación y el del
// aprendiz. Ninguno bloquea nada: el plan advierte, se cumple y queda como constancia.

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
  fechaLimite: string | null;
  fechaAutorizacion: string | null;
  observacionesCoordinacion: string | null;
  fechaCierre: string | null;
  verificacion: string | null;
  soporteUrl: string | null;
  creadoPor: string | null;
  autorizadoPor: string | null;
  cerradoPor: string | null;
  creadoEn: string;
  diasRestantes: number | null;
  vencido: boolean;
  abierto: boolean;
  aprendiz: { id: string; nombre: string; cedula: string; ficha: string | null };
};

const tonoEstado: Record<EstadoPlanMejoramientoValue, string> = {
  POR_AUTORIZAR: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  VIGENTE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  CUMPLIDO: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  NO_CUMPLIDO: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  DEVUELTO: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

// Día de calendario guardado a medianoche UTC.
export function diaLegible(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function textoPlazo(plan: PlanItem): string | null {
  if (!plan.fechaLimite) return `Plazo propuesto: ${plan.diasPlazo} días calendario desde que se autorice`;
  const hasta = `hasta el ${diaLegible(plan.fechaLimite)}`;
  if (plan.diasRestantes === null) return hasta;
  if (plan.diasRestantes < 0) {
    const dias = Math.abs(plan.diasRestantes);
    return `Vencido ${hasta} (hace ${dias} ${dias === 1 ? "día" : "días"})`;
  }
  if (plan.diasRestantes === 0) return `Vence hoy, ${hasta.replace("hasta el ", "")}`;
  return `Quedan ${plan.diasRestantes} ${plan.diasRestantes === 1 ? "día" : "días"} — ${hasta}`;
}

export function PlanTarjeta({
  plan,
  mostrarAprendiz = true,
  children,
}: {
  plan: PlanItem;
  mostrarAprendiz?: boolean;
  children?: React.ReactNode;
}) {
  const plazo = textoPlazo(plan);

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            Plan de mejoramiento · Momento {plan.momento}
          </p>
          {mostrarAprendiz && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {plan.aprendiz.nombre} · CC {plan.aprendiz.cedula} · Ficha{" "}
              {plan.aprendiz.ficha ?? "sin asignar"}
            </p>
          )}
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Redactado el {formatoMomento(plan.creadoEn)}
            {plan.creadoPor ? ` por ${plan.creadoPor}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tonoEstado[plan.estado]}`}>
            {plan.estadoLabel}
          </span>
          {plazo && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                plan.vencido
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {plazo}
            </span>
          )}
        </div>
      </div>

      <dl className="mt-3 flex flex-col gap-2 text-sm">
        {(
          [
            ["Resultados de aprendizaje por superar", plan.resultadosNoSuperados],
            ["Actividades de aprendizaje", plan.actividades],
            ["Evidencias por presentar", plan.evidencias],
            ["Llamados de atención previos", plan.llamadosPrevios],
          ] as const
        ).map(([titulo, cuerpo]) => (
          <div key={titulo}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {titulo}
            </dt>
            <dd className="whitespace-pre-line text-zinc-800 dark:text-zinc-200">{cuerpo}</dd>
          </div>
        ))}
      </dl>

      {plan.fechaAutorizacion && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Autorizado el {formatoMomento(plan.fechaAutorizacion)}
          {plan.autorizadoPor ? ` por ${plan.autorizadoPor}` : ""}.
        </p>
      )}
      {plan.observacionesCoordinacion && (
        <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <strong>Coordinación:</strong> {plan.observacionesCoordinacion}
        </p>
      )}
      {plan.fechaCierre && (
        <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <strong>Verificación del instructor</strong> ({formatoMomento(plan.fechaCierre)}
          {plan.cerradoPor ? ` · ${plan.cerradoPor}` : ""}): {plan.verificacion}
        </p>
      )}
      {plan.soporteUrl && (
        <a
          href={plan.soporteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-emerald-700 underline dark:text-emerald-500"
        >
          Ver el plan firmado
        </a>
      )}
      {children}
    </li>
  );
}

// Lo que ve el aprendiz dentro de «Evaluaciones»: sus compromisos y hasta cuándo. Solo consulta.
export function PlanesAprendiz() {
  const [planes, setPlanes] = useState<PlanItem[] | null>(null);

  useEffect(() => {
    fetch("/api/etapa-productiva/plan-mejoramiento")
      .then((res) => res.json())
      .then((data) => setPlanes(data.planes ?? []))
      .catch(() => setPlanes([]));
  }, []);

  if (!planes || planes.length === 0) return null;

  return (
    <section className="mb-6 w-full">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        Plan de mejoramiento
      </h2>
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Actividades y evidencias con las que superas los resultados de aprendizaje que quedaron
        pendientes. Lo redacta tu instructor, lo autoriza la coordinación académica y tu instructor
        verifica que se cumpla.
      </p>
      <ul className="flex flex-col gap-3">
        {planes.map((plan) => (
          <PlanTarjeta key={plan.id} plan={plan} mostrarAprendiz={false} />
        ))}
      </ul>
    </section>
  );
}
