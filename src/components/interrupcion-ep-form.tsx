"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/components/file-upload-field";
import { DatePickerField } from "@/components/date-picker-field";
import {
  MotivoInterrupcionEPValues,
  motivoInterrupcionEPLabel,
  type MotivoInterrupcionEPValue,
} from "@/lib/validations";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

export type InterrupcionReportada = {
  id: string;
  fechaInterrupcion: string;
  diasEjecutados: number;
  motivo: MotivoInterrupcionEPValue;
  motivoDetalle: string | null;
  estado: string;
  observacionesAval: string | null;
};

const estadoStyles: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
  APROBADA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
  RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
};
const estadoText: Record<string, string> = {
  PENDIENTE: "Pendiente de aval",
  APROBADA: "Avalada",
  RECHAZADA: "Rechazada",
};

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

export function InterrupcionEPForm({
  tieneAlternativaVigente,
  fechaInicioEP,
  historial,
}: {
  tieneAlternativaVigente: boolean;
  fechaInicioEP: string | null;
  historial: InterrupcionReportada[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fechaInterrupcion, setFechaInterrupcion] = useState("");
  const [motivo, setMotivo] = useState<MotivoInterrupcionEPValue | "">("");
  const [motivoDetalle, setMotivoDetalle] = useState("");
  const [certificadoUrl, setCertificadoUrl] = useState("");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const pendiente = historial.find((h) => h.estado === "PENDIENTE");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (subiendoArchivo) return;
    setErrors({});
    setLoading(true);

    const res = await fetch("/api/etapa-productiva/interrupcion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fechaInterrupcion,
        motivo,
        motivoDetalle: motivoDetalle || null,
        certificadoUrl: certificadoUrl || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setErrors(data.error ?? {});
      return;
    }

    setAbierto(false);
    setFechaInterrupcion("");
    setMotivo("");
    setMotivoDetalle("");
    setCertificadoUrl("");
    router.refresh();
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        ¿No pudiste terminar tu Etapa Productiva?
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Si tuviste que dejar la práctica antes de completar el tiempo (renuncia, liquidación de la
        empresa, salud, traslado…), repórtalo aquí. El tiempo que alcanzaste a cumplir se te
        cuenta: al retomar con otra alternativa solo tendrás que completar los días que falten.
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
                  {motivoInterrupcionEPLabel[h.motivo]} · último día{" "}
                  {formatoFecha(h.fechaInterrupcion)} · {h.diasEjecutados} día(s) cumplidos
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${estadoStyles[h.estado] ?? ""}`}
                >
                  {estadoText[h.estado] ?? h.estado}
                </span>
              </div>
              {h.observacionesAval && (
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                  Coordinación: {h.observacionesAval}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendiente ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
          Tu reporte está pendiente de aval de Coordinación. Cuando lo avalen podrás enviar la
          solicitud de la nueva alternativa con la que retomarás la práctica.
        </p>
      ) : !tieneAlternativaVigente ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no tienes una alternativa vigente que puedas interrumpir.
        </p>
      ) : !abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-4 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reportar interrupción de la práctica
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <DatePickerField
            label="Último día de práctica"
            required
            value={fechaInterrupcion}
            onChange={setFechaInterrupcion}
            error={errors.fechaInterrupcion?.[0]}
            min={fechaInicioEP ?? undefined}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Motivo <span className="text-red-600">*</span>
            </label>
            <select
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoInterrupcionEPValue)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona el motivo
              </option>
              {MotivoInterrupcionEPValues.map((m) => (
                <option key={m} value={m}>
                  {motivoInterrupcionEPLabel[m]}
                </option>
              ))}
            </select>
            {errors.motivo && <p className="text-sm text-red-600">{errors.motivo[0]}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Detalle del motivo {motivo === "OTRO" && <span className="text-red-600">*</span>}
            </label>
            <textarea
              value={motivoDetalle}
              onChange={(e) => setMotivoDetalle(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Explica brevemente qué pasó"
            />
            {errors.motivoDetalle && (
              <p className="text-sm text-red-600">{errors.motivoDetalle[0]}</p>
            )}
          </div>

          <FileUploadField
            label="Certificado de práctica parcial (lo expide la empresa o entidad)"
            pathPrefix="interrupcion-ep"
            value={certificadoUrl || null}
            onChange={setCertificadoUrl}
            error={errors.certificadoUrl?.[0]}
            onUploadingChange={setSubiendoArchivo}
          />
          <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Es el soporte del tiempo que alcanzaste a cumplir. Sin él, Coordinación no puede
            contabilizar esos días para tu nueva alternativa.
          </p>

          {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}

          <div className="flex gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="submit"
              disabled={loading || subiendoArchivo}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {loading ? "Enviando…" : subiendoArchivo ? "Subiendo archivo…" : "Enviar reporte"}
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
