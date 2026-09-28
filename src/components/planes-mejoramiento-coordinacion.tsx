"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import { PlanTarjeta, type PlanItem } from "@/components/plan-mejoramiento";

// Autorización de los planes de mejoramiento (guía GFPI-G-040 §9.4; Acuerdo 009: el plan lo firman
// el aprendiz y el coordinador académico). Autorizarlo equivale a suscribirlo: ahí arranca el
// plazo y sale la comunicación escrita al aprendiz, con copia al instructor que lo redactó.

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

export function PlanesMejoramientoCoordinacion() {
  const [planes, setPlanes] = useState<PlanItem[] | null>(null);
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function cargar() {
    fetch("/api/coordinador/planes-mejoramiento")
      .then((res) => res.json())
      .then((data) => setPlanes(data.planes ?? []))
      .catch(() => setPlanes([]));
  }

  useEffect(cargar, []);

  async function decidir(id: string, decision: "AUTORIZAR" | "DEVOLVER") {
    setGuardando(id);
    setError(null);
    setAviso(null);
    const res = await fetch(`/api/coordinador/planes-mejoramiento/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, observacionesCoordinacion: observaciones[id] ?? "" }),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(null);
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : (data.error?.observacionesCoordinacion?.[0] ?? data.error?._root?.[0] ?? "No se pudo guardar."),
      );
      return;
    }
    if (decision === "AUTORIZAR") {
      const partes = ["Plan autorizado."];
      if (data.recortadaPorFinEP) {
        partes.push("El plazo se recortó hasta el fin de la etapa productiva del aprendiz.");
      }
      if (data.correoEnviado === false) {
        partes.push("No se pudo enviar el correo al aprendiz: avísale por otro medio.");
      }
      setAviso(partes.join(" "));
    }
    setObservaciones((prev) => ({ ...prev, [id]: "" }));
    cargar();
  }

  if (planes === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const pendientes = planes.filter((p) => p.estado === "POR_AUTORIZAR").length;
  const vigentes = planes.filter((p) => p.estado === "VIGENTE").length;
  const noCumplidos = planes.filter((p) => p.estado === "NO_CUMPLIDO").length;
  const visibles = soloPendientes ? planes.filter((p) => p.estado === "POR_AUTORIZAR") : planes;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="ambar" etiqueta="por autorizar" cantidad={pendientes} />
        <StatBadge tono="verde" etiqueta="vigentes" cantidad={vigentes} />
        <StatBadge tono="rojo" etiqueta="no cumplidos" cantidad={noCumplidos} />
        <label className="ml-auto flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={soloPendientes}
            onChange={(e) => setSoloPendientes(e.target.checked)}
          />
          Solo los que esperan mi firma
        </label>
      </div>

      {aviso && (
        <p className="rounded-md bg-sena-claro px-3 py-2 text-sm text-azul dark:bg-emerald-900/20 dark:text-emerald-400">
          {aviso}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {soloPendientes ? "No hay planes esperando autorización." : "No hay planes de mejoramiento."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((plan) => (
            <PlanTarjeta key={plan.id} plan={plan}>
              {plan.estado === "POR_AUTORIZAR" && (
                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <textarea
                    placeholder="Observación (obligatoria si lo devuelves al instructor)"
                    value={observaciones[plan.id] ?? ""}
                    onChange={(e) =>
                      setObservaciones((prev) => ({ ...prev, [plan.id]: e.target.value }))
                    }
                    rows={2}
                    className={inputClass}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={guardando === plan.id}
                      onClick={() => decidir(plan.id, "AUTORIZAR")}
                      className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
                    >
                      {guardando === plan.id ? "Guardando…" : "Autorizar y comunicar"}
                    </button>
                    <button
                      type="button"
                      disabled={guardando === plan.id}
                      onClick={() => decidir(plan.id, "DEVOLVER")}
                      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      Devolver al instructor
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Al autorizar arranca el plazo de {plan.diasPlazo} días calendario y le llega la
                    comunicación al aprendiz, con copia a su instructor.
                  </p>
                </div>
              )}
            </PlanTarjeta>
          ))}
        </ul>
      )}
    </div>
  );
}
