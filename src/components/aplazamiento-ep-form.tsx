"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/components/file-upload-field";
import { DatePickerField } from "@/components/date-picker-field";
import {
  MotivoAplazamientoEPValues,
  motivoAplazamientoEPLabel,
  type MotivoAplazamientoEPValue,
} from "@/lib/validations";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

export type AplazamientoReportado = {
  id: string;
  fechaSuspension: string;
  fechaReanudacionPrevista: string;
  fechaReanudacionReal: string | null;
  diasEjecutados: number;
  motivo: MotivoAplazamientoEPValue;
  motivoDetalle: string | null;
  estado: string;
  observacionesAval: string | null;
  actaComite: string | null;
};

const estadoStyles: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
  APROBADA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
  RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
};
const estadoText: Record<string, string> = {
  PENDIENTE: "Pendiente del Comité",
  APROBADA: "Autorizado",
  RECHAZADA: "Negado",
};

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

export function AplazamientoEPForm({
  puedeAplazar,
  practicaAplazada,
  fechaInicioEP,
  historial,
}: {
  puedeAplazar: boolean;
  practicaAplazada: boolean;
  fechaInicioEP: string | null;
  historial: AplazamientoReportado[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fechaSuspension, setFechaSuspension] = useState("");
  const [fechaReanudacionPrevista, setFechaReanudacionPrevista] = useState("");
  const [motivo, setMotivo] = useState<MotivoAplazamientoEPValue | "">("");
  const [motivoDetalle, setMotivoDetalle] = useState("");
  const [soporteUrl, setSoporteUrl] = useState("");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const pendiente = historial.find((h) => h.estado === "PENDIENTE");
  const vigente = historial.find((h) => h.estado === "APROBADA" && !h.fechaReanudacionReal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (subiendoArchivo) return;
    setErrors({});
    setLoading(true);

    const res = await fetch("/api/etapa-productiva/aplazamiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fechaSuspension,
        fechaReanudacionPrevista,
        motivo,
        motivoDetalle: motivoDetalle || null,
        soporteUrl: soporteUrl || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setErrors(data.error ?? {});
      return;
    }

    setAbierto(false);
    setFechaSuspension("");
    setFechaReanudacionPrevista("");
    setMotivo("");
    setMotivoDetalle("");
    setSoporteUrl("");
    router.refresh();
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        ¿Tienes una novedad que te impide seguir por ahora?
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Licencia de maternidad, incapacidad, vacaciones colectivas de la empresa o fuerza mayor no
        terminan tu práctica: la pausan. Vuelves con la misma empresa y la misma alternativa, y el
        tiempo que ya cumpliste se te cuenta. Lo autoriza el Comité de Evaluación y Seguimiento.
      </p>

      {historial.length > 0 && (
        <ul className="mt-4 space-y-2">
          {historial.map((h) => (
            <li
              key={h.id}
              className="rounded-md border border-zinc-200 p-3 text-xs dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-700 dark:text-zinc-300">
                  {motivoAplazamientoEPLabel[h.motivo]} · desde {formatoFecha(h.fechaSuspension)} ·
                  regreso previsto {formatoFecha(h.fechaReanudacionPrevista)}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${estadoStyles[h.estado] ?? ""}`}
                >
                  {estadoText[h.estado] ?? h.estado}
                </span>
              </div>
              {h.fechaReanudacionReal && (
                <p className="mt-1 text-emerald-700 dark:text-emerald-500">
                  Reanudado el {formatoFecha(h.fechaReanudacionReal)}.
                </p>
              )}
              {h.actaComite && (
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">Acta {h.actaComite}</p>
              )}
              {h.observacionesAval && (
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                  Comité: {h.observacionesAval}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendiente ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
          Tu solicitud está pendiente de autorización del Comité de Evaluación y Seguimiento.
        </p>
      ) : vigente || practicaAplazada ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Tu práctica está aplazada. Cuando vuelvas, avísale a tu Coordinación para que registre la
          reanudación: ahí se recalculan tus fechas con el tiempo que te falta y sigues con la misma
          alternativa.
        </p>
      ) : !puedeAplazar ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no tienes una Etapa Productiva en curso que puedas aplazar.
        </p>
      ) : !abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-4 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Solicitar aplazamiento
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePickerField
              label="Último día de práctica"
              required
              value={fechaSuspension}
              onChange={setFechaSuspension}
              error={errors.fechaSuspension?.[0]}
              min={fechaInicioEP ?? undefined}
            />
            <DatePickerField
              label="Fecha prevista de regreso"
              required
              value={fechaReanudacionPrevista}
              onChange={setFechaReanudacionPrevista}
              error={errors.fechaReanudacionPrevista?.[0]}
              min={fechaSuspension || fechaInicioEP || undefined}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Novedad <span className="text-red-600">*</span>
            </label>
            <select
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoAplazamientoEPValue)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona la novedad
              </option>
              {MotivoAplazamientoEPValues.map((m) => (
                <option key={m} value={m}>
                  {motivoAplazamientoEPLabel[m]}
                </option>
              ))}
            </select>
            {errors.motivo && <p className="text-sm text-red-600">{errors.motivo[0]}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Detalle {motivo === "OTRO" && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={motivoDetalle}
              onChange={(e) => setMotivoDetalle(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Explica brevemente la novedad"
            />
            {errors.motivoDetalle && (
              <p className="text-sm text-red-600">{errors.motivoDetalle[0]}</p>
            )}
          </div>

          <FileUploadField
            label="Soporte de la novedad (licencia, incapacidad de la EPS, carta de la empresa…)"
            pathPrefix="aplazamiento-ep"
            value={soporteUrl || null}
            onChange={setSoporteUrl}
            error={errors.soporteUrl?.[0]}
            onUploadingChange={setSubiendoArchivo}
          />

          {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}

          <div className="flex gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="submit"
              disabled={loading || subiendoArchivo}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {loading ? "Enviando…" : subiendoArchivo ? "Subiendo archivo…" : "Enviar solicitud"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
