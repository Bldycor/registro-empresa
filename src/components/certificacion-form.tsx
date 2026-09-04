"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/components/file-upload-field";
import { DatePickerField } from "@/components/date-picker-field";

type FormFields = {
  fecha: string;
  archivoUrl: string;
};

export function CertificacionForm({
  initial,
  fechaMin,
  fechaMax,
}: {
  initial: { fecha: string; archivoUrl: string } | null;
  fechaMin?: string;
  fechaMax?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(initial ?? { fecha: "", archivoUrl: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function cancelar() {
    router.back();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/etapa-productiva/certificacion", {
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
        <DatePickerField
          label="Fecha de la carta de certificación"
          required
          value={form.fecha}
          onChange={(v) => update("fecha", v)}
          error={errors.fecha?.[0]}
          min={fechaMin}
          max={fechaMax}
        />

        <FileUploadField
          label="Carta de certificación (adjunto)"
          pathPrefix="certificacion-ep"
          value={form.archivoUrl || null}
          onChange={(url) => update("archivoUrl", url)}
          error={errors.archivoUrl?.[0]}
          required
        />

        {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
        {success && (
          <p className="text-sm text-emerald-700 dark:text-emerald-500">
            Carta enviada — queda pendiente de aval del instructor.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Enviando…" : initial ? "Reemplazar carta" : "Enviar carta"}
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
