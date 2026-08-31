"use client";

import { useState } from "react";
import { BitacoraForm, type BitacoraFormInitial, type BitacoraPrefillPrevio } from "@/components/bitacora-form";

export type BitacoraSlot = {
  numero: number;
  fechaLimite: string;
  periodoSugerido: { desde: string; hasta: string };
  existing: {
    fechaEntrega: string | null;
    estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
    observaciones: string | null;
    periodoDesde: string | null;
    periodoHasta: string | null;
    archivoUrl: string | null;
    arlAfiliado: boolean | null;
    arlNivelRiesgo: string | null;
    arlRiesgoCorresponde: boolean | null;
    arlTieneEPP: boolean | null;
    actividades: {
      descripcion: string;
      competencias: string | null;
      evidenciaCumplimiento: string | null;
      observaciones: string | null;
    }[];
  } | null;
  prefillPrevio: BitacoraPrefillPrevio;
};

const estadoStyles: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
  APROBADA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
  RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
};
const estadoText: Record<string, string> = {
  PENDIENTE: "Pendiente de aval",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function BitacorasAprendizPanel({ slots }: { slots: BitacoraSlot[] }) {
  const [abiertoNumero, setAbiertoNumero] = useState<number | null>(null);

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full max-w-2xl space-y-3">
      {slots.map((slot) => {
        const atrasada =
          !slot.existing && slot.fechaLimite.slice(0, 10) < hoy;
        const isOpen = abiertoNumero === slot.numero;

        const initial: BitacoraFormInitial = slot.existing
          ? {
              periodoDesde: toDateInput(slot.existing.periodoDesde),
              periodoHasta: toDateInput(slot.existing.periodoHasta),
              archivoUrl: slot.existing.archivoUrl,
              arlAfiliado: slot.existing.arlAfiliado,
              arlNivelRiesgo: slot.existing.arlNivelRiesgo,
              arlRiesgoCorresponde: slot.existing.arlRiesgoCorresponde,
              arlTieneEPP: slot.existing.arlTieneEPP,
              actividades: slot.existing.actividades,
            }
          : null;

        return (
          <div
            key={slot.numero}
            className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              onClick={() => setAbiertoNumero(isOpen ? null : slot.numero)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  Bitácora {slot.numero}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Fecha límite: {formatoFecha(slot.fechaLimite)}
                  {slot.existing?.fechaEntrega &&
                    ` · Enviada: ${formatoFecha(slot.existing.fechaEntrega)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {atrasada && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-400">
                    Atrasada
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    slot.existing
                      ? estadoStyles[slot.existing.estado]
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {slot.existing ? estadoText[slot.existing.estado] : "Sin enviar"}
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </button>

            {slot.existing?.observaciones && slot.existing.estado === "RECHAZADA" && (
              <p className="px-5 pb-3 text-xs text-red-700 dark:text-red-400">
                Observaciones del instructor: {slot.existing.observaciones}
              </p>
            )}

            {isOpen && (
              <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                <BitacoraForm
                  numero={slot.numero}
                  initial={initial}
                  periodoSugerido={{
                    desde: toDateInput(slot.periodoSugerido.desde),
                    hasta: toDateInput(slot.periodoSugerido.hasta),
                  }}
                  prefillPrevio={slot.prefillPrevio}
                  onSaved={() => setAbiertoNumero(null)}
                  onCancel={() => setAbiertoNumero(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
