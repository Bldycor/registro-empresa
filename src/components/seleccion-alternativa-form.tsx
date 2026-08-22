"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/components/file-upload-field";
import { DatePickerField } from "@/components/date-picker-field";
import {
  AlternativaEtapaProductivaValues,
  alternativaEtapaProductivaLabel,
  subtipoAlternativaEtapaProductivaLabel,
  subtiposPorAlternativa,
  TipoSolicitudAlternativaValues,
  tipoSolicitudAlternativaLabel,
  type AlternativaEtapaProductivaValue,
  type SubtipoAlternativaEtapaProductivaValue,
  type TipoSolicitudAlternativaValue,
} from "@/lib/validations";

type FormFields = {
  tipoSolicitud: TipoSolicitudAlternativaValue | "";
  alternativa: AlternativaEtapaProductivaValue | "";
  subtipoAlternativa: SubtipoAlternativaEtapaProductivaValue | "";
  fechaInicioEjecucion: string;
  fechaFinEjecucion: string;
  archivoUrl: string;
};

const initialState: FormFields = {
  tipoSolicitud: "",
  alternativa: "",
  subtipoAlternativa: "",
  fechaInicioEjecucion: "",
  fechaFinEjecucion: "",
  archivoUrl: "",
};

export function SeleccionAlternativaForm({
  tieneAlternativaVigente,
}: {
  tieneAlternativaVigente: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>({
    ...initialState,
    tipoSolicitud: tieneAlternativaVigente ? "MODIFICACION" : "SELECCION",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const subtipos = form.alternativa ? subtiposPorAlternativa[form.alternativa] : [];

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "alternativa" ? { subtipoAlternativa: "" } : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/etapa-productiva/alternativa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        subtipoAlternativa: form.subtipoAlternativa || null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setErrors(data.error ?? {});
      return;
    }

    setSuccess(true);
    setForm({ ...initialState, tipoSolicitud: "MODIFICACION" });
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Enviar solicitud
      </h2>

      <div className="flex flex-col gap-4">
        <Field label="Tipo de solicitud" error={errors.tipoSolicitud?.[0]}>
          <select
            required
            value={form.tipoSolicitud}
            onChange={(e) => update("tipoSolicitud", e.target.value as TipoSolicitudAlternativaValue)}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona
            </option>
            {TipoSolicitudAlternativaValues.map((v) => (
              <option key={v} value={v}>
                {tipoSolicitudAlternativaLabel[v]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Alternativa de Etapa Productiva" error={errors.alternativa?.[0]}>
          <select
            required
            value={form.alternativa}
            onChange={(e) => update("alternativa", e.target.value as AlternativaEtapaProductivaValue)}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona la alternativa
            </option>
            {AlternativaEtapaProductivaValues.map((v) => (
              <option key={v} value={v}>
                {alternativaEtapaProductivaLabel[v]}
              </option>
            ))}
          </select>
        </Field>

        {form.alternativa && (
          <Field label="Subtipo de alternativa" error={errors.subtipoAlternativa?.[0]}>
            <select
              value={form.subtipoAlternativa}
              onChange={(e) =>
                update("subtipoAlternativa", e.target.value as SubtipoAlternativaEtapaProductivaValue)
              }
              className={inputClass}
            >
              <option value="">Sin subtipo específico</option>
              {subtipos.map((v) => (
                <option key={v} value={v}>
                  {subtipoAlternativaEtapaProductivaLabel[v]}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DatePickerField
            label="Fecha inicio de ejecución"
            required
            value={form.fechaInicioEjecucion}
            onChange={(v) => update("fechaInicioEjecucion", v)}
            error={errors.fechaInicioEjecucion?.[0]}
            max={form.fechaFinEjecucion || undefined}
          />
          <DatePickerField
            label="Fecha fin de ejecución"
            required
            value={form.fechaFinEjecucion}
            onChange={(v) => update("fechaFinEjecucion", v)}
            error={errors.fechaFinEjecucion?.[0]}
            min={form.fechaInicioEjecucion || undefined}
          />
        </div>

        <FileUploadField
          label="Formato GFPI-F-165 firmado (adjunto)"
          pathPrefix="alternativa-ep"
          value={form.archivoUrl || null}
          onChange={(url) => update("archivoUrl", url)}
          error={errors.archivoUrl?.[0]}
          required
        />

        {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
        {success && (
          <p className="text-sm text-emerald-700 dark:text-emerald-500">
            Solicitud enviada — queda pendiente de aval del coordinador.
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
