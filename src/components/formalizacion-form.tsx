"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/components/file-upload-field";
import { DatePickerField } from "@/components/date-picker-field";
import { TIPOS_DOCUMENTO_FORMALIZACION } from "@/lib/validations";

type FormFields = {
  tipoDocumento: string;
  fecha: string;
  archivoUrl: string;
};

export function FormalizacionForm({
  initial,
}: {
  initial: { tipoDocumento: string; fecha: string; archivoUrl: string } | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(
    initial ?? { tipoDocumento: "", fecha: "", archivoUrl: "" },
  );
  const tipoEsPreset = (TIPOS_DOCUMENTO_FORMALIZACION as readonly string[]).includes(
    form.tipoDocumento,
  );
  const [otroSeleccionado, setOtroSeleccionado] = useState(
    !tipoEsPreset && form.tipoDocumento !== "",
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Cambiar esta key fuerza a FileUploadField a remontarse desde cero — es la única forma de
  // limpiar su estado interno (archivo mostrado, error de subida) al cancelar, ya que un
  // <input type="file"> no se puede vaciar programáticamente.
  const [formKey, setFormKey] = useState(0);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function cancelar() {
    const base = initial ?? { tipoDocumento: "", fecha: "", archivoUrl: "" };
    setForm(base);
    setOtroSeleccionado(!(TIPOS_DOCUMENTO_FORMALIZACION as readonly string[]).includes(base.tipoDocumento) && base.tipoDocumento !== "");
    setErrors({});
    setSuccess(false);
    setFormKey((k) => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/etapa-productiva/formalizacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setErrors(data.error ?? {});
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-4">
        <Field label="Tipo de documento" error={errors.tipoDocumento?.[0]}>
          <select
            required
            value={otroSeleccionado ? "Otro" : form.tipoDocumento}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "Otro") {
                setOtroSeleccionado(true);
                update("tipoDocumento", "");
              } else {
                setOtroSeleccionado(false);
                update("tipoDocumento", value);
              }
            }}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona
            </option>
            {TIPOS_DOCUMENTO_FORMALIZACION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        {otroSeleccionado && (
          <Field label="Especifica el tipo de documento">
            <input
              value={form.tipoDocumento}
              placeholder="Ej. Acta de nombramiento"
              onChange={(e) => update("tipoDocumento", e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        <DatePickerField
          label="Fecha del documento"
          required
          value={form.fecha}
          onChange={(v) => update("fecha", v)}
          error={errors.fecha?.[0]}
        />

        <FileUploadField
          key={formKey}
          label="Documento certificador (adjunto)"
          pathPrefix="formalizacion-ep"
          value={form.archivoUrl || null}
          onChange={(url) => update("archivoUrl", url)}
          error={errors.archivoUrl?.[0]}
          required
        />

        {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
        {success && (
          <p className="text-sm text-emerald-700 dark:text-emerald-500">
            Documento enviado — queda pendiente de aval del instructor.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Enviando…" : initial ? "Reemplazar documento" : "Enviar documento"}
          </button>
          <button
            type="button"
            onClick={cancelar}
            disabled={loading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
        </div>
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
