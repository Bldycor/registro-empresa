"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/components/file-upload-field";
import { DatePickerField } from "@/components/date-picker-field";
import { NivelRiesgoARLValues, nivelRiesgoARLLabel } from "@/lib/validations";

type CompetenciaCatalogo = {
  id: string;
  tipo: "TECNICA" | "BASICA_CLAVE";
  nombreCompetencia: string;
  resultadoAprendizaje: string;
};

type Actividad = {
  descripcion: string;
  competencias: string;
  evidenciaCumplimiento: string;
  observaciones: string;
};

type FormFields = {
  periodoDesde: string;
  periodoHasta: string;
  archivoUrl: string;
  arlAfiliado: string;
  arlNivelRiesgo: string;
  arlRiesgoCorresponde: string;
  arlTieneEPP: string;
  actividades: Actividad[];
};

const actividadVacia: Actividad = {
  descripcion: "",
  competencias: "",
  evidenciaCumplimiento: "",
  observaciones: "",
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function agruparCompetencias(catalogo: CompetenciaCatalogo[]) {
  const grupos = new Map<string, CompetenciaCatalogo[]>();
  for (const c of catalogo) {
    const lista = grupos.get(c.nombreCompetencia) ?? [];
    lista.push(c);
    grupos.set(c.nombreCompetencia, lista);
  }
  return Array.from(grupos.entries());
}

function booleanAString(v: boolean | null): string {
  return v === true ? "SI" : v === false ? "NO" : "";
}

export type BitacoraFormInitial = {
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

// Datos de la bitácora anterior más reciente que ya se envió — se usan solo para prellenar una
// bitácora nueva (ARL y actividades suelen repetirse quincena a quincena), nunca para pisar algo
// que el aprendiz ya haya diligenciado.
export type BitacoraPrefillPrevio = {
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

export function BitacoraForm({
  numero,
  initial,
  periodoSugerido,
  prefillPrevio,
  onSaved,
  onCancel,
}: {
  numero: number;
  initial: BitacoraFormInitial;
  periodoSugerido?: { desde: string; hasta: string };
  prefillPrevio?: BitacoraPrefillPrevio;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(
    initial
      ? {
          periodoDesde: initial.periodoDesde ?? periodoSugerido?.desde ?? "",
          periodoHasta: initial.periodoHasta ?? periodoSugerido?.hasta ?? "",
          archivoUrl: initial.archivoUrl ?? "",
          arlAfiliado: booleanAString(initial.arlAfiliado),
          arlNivelRiesgo: initial.arlNivelRiesgo ?? "",
          arlRiesgoCorresponde: booleanAString(initial.arlRiesgoCorresponde),
          arlTieneEPP: booleanAString(initial.arlTieneEPP),
          actividades:
            initial.actividades.length > 0
              ? initial.actividades.map((a) => ({
                  descripcion: a.descripcion,
                  competencias: a.competencias ?? "",
                  evidenciaCumplimiento: a.evidenciaCumplimiento ?? "",
                  observaciones: a.observaciones ?? "",
                }))
              : [actividadVacia],
        }
      : {
          periodoDesde: periodoSugerido?.desde ?? "",
          periodoHasta: periodoSugerido?.hasta ?? "",
          archivoUrl: "",
          arlAfiliado: booleanAString(prefillPrevio?.arlAfiliado ?? null),
          arlNivelRiesgo: prefillPrevio?.arlNivelRiesgo ?? "",
          arlRiesgoCorresponde: booleanAString(prefillPrevio?.arlRiesgoCorresponde ?? null),
          arlTieneEPP: booleanAString(prefillPrevio?.arlTieneEPP ?? null),
          actividades:
            prefillPrevio?.actividades && prefillPrevio.actividades.length > 0
              ? prefillPrevio.actividades.map((a) => ({
                  descripcion: a.descripcion,
                  competencias: a.competencias ?? "",
                  evidenciaCumplimiento: a.evidenciaCumplimiento ?? "",
                  observaciones: a.observaciones ?? "",
                }))
              : [actividadVacia],
        }
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [catalogoCompetencias, setCatalogoCompetencias] = useState<CompetenciaCatalogo[] | null>(
    null
  );

  useEffect(() => {
    fetch("/api/etapa-productiva/competencias")
      .then((res) => res.json())
      .then((data) => setCatalogoCompetencias(data.competencias ?? []))
      .catch(() => setCatalogoCompetencias([]));
  }, []);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateActividad(idx: number, key: keyof Actividad, value: string) {
    setForm((prev) => ({
      ...prev,
      actividades: prev.actividades.map((a, i) => (i === idx ? { ...a, [key]: value } : a)),
    }));
  }

  function agregarActividad() {
    setForm((prev) => ({ ...prev, actividades: [...prev.actividades, actividadVacia] }));
  }

  function quitarActividad(idx: number) {
    setForm((prev) => ({
      ...prev,
      actividades: prev.actividades.length > 1 ? prev.actividades.filter((_, i) => i !== idx) : prev.actividades,
    }));
  }

  const usandoPrefill = !initial && Boolean(prefillPrevio);

  function cancelar() {
    // Cuando el formulario está anidado en un acordeón (lista de las 12 bitácoras en una sola
    // página), "Cancelar" solo debe cerrar esa fila — router.back() sacaría al aprendiz de toda
    // la página. Fuera de ese contexto (sin onCancel), sí navega atrás como el resto de evidencias.
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/etapa-productiva/bitacoras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero,
        periodoDesde: form.periodoDesde || null,
        periodoHasta: form.periodoHasta || null,
        archivoUrl: form.archivoUrl,
        arlAfiliado: form.arlAfiliado ? form.arlAfiliado === "SI" : null,
        arlNivelRiesgo: form.arlNivelRiesgo || null,
        arlRiesgoCorresponde: form.arlRiesgoCorresponde ? form.arlRiesgoCorresponde === "SI" : null,
        arlTieneEPP: form.arlTieneEPP ? form.arlTieneEPP === "SI" : null,
        actividades: form.actividades.map((a) => ({
          descripcion: a.descripcion,
          competencias: a.competencias || null,
          evidenciaCumplimiento: a.evidenciaCumplimiento || null,
          observaciones: a.observaciones || null,
        })),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setErrors(data.error ?? {});
      return;
    }

    setSuccess(true);
    if (onSaved) onSaved();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePickerField
              label="Período desde"
              value={form.periodoDesde}
              onChange={(v) => update("periodoDesde", v)}
              error={errors.periodoDesde?.[0]}
            />
            <DatePickerField
              label="Período hasta"
              value={form.periodoHasta}
              onChange={(v) => update("periodoHasta", v)}
              error={errors.periodoHasta?.[0]}
            />
          </div>
          {periodoSugerido && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Calculado automáticamente según tu fecha de inicio de Etapa Productiva — puedes
              ajustarlo si es necesario.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h3 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Afiliación a ARL
          </h3>
          {usandoPrefill && (
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Precargado desde tu última bitácora — ajústalo si algo cambió.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="¿Estás afiliado a la ARL?">
              <select
                value={form.arlAfiliado}
                onChange={(e) => update("arlAfiliado", e.target.value)}
                className={inputClass}
              >
                <option value="">Sin definir</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
            </Field>
            <Field label="Nivel de riesgo">
              <select
                value={form.arlNivelRiesgo}
                onChange={(e) => update("arlNivelRiesgo", e.target.value)}
                className={inputClass}
              >
                <option value="">Sin definir</option>
                {NivelRiesgoARLValues.map((v) => (
                  <option key={v} value={v}>
                    {nivelRiesgoARLLabel[v]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="¿El nivel de riesgo corresponde a tu labor?">
              <select
                value={form.arlRiesgoCorresponde}
                onChange={(e) => update("arlRiesgoCorresponde", e.target.value)}
                className={inputClass}
              >
                <option value="">Sin definir</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
            </Field>
            <Field label="¿La empresa te suministra los EPP?">
              <select
                value={form.arlTieneEPP}
                onChange={(e) => update("arlTieneEPP", e.target.value)}
                className={inputClass}
              >
                <option value="">Sin definir</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
              </select>
            </Field>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Descripción de las actividades realizadas
            </h3>
            <button
              type="button"
              onClick={agregarActividad}
              className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              + Agregar actividad
            </button>
          </div>
          {usandoPrefill && (
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Precargadas desde tu última bitácora — edítalas, quítalas o agrega nuevas.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {form.actividades.map((actividad, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Actividad {idx + 1}
                  </span>
                  {form.actividades.length > 1 && (
                    <button
                      type="button"
                      onClick={() => quitarActividad(idx)}
                      className="text-xs font-medium text-red-600 underline hover:text-red-800 dark:text-red-500"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Field
                    label="Descripción"
                    error={idx === 0 ? errors["actividades.0.descripcion"]?.[0] : undefined}
                  >
                    <textarea
                      required
                      rows={2}
                      value={actividad.descripcion}
                      onChange={(e) => updateActividad(idx, "descripcion", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Competencias / resultados de aprendizaje">
                    {catalogoCompetencias && catalogoCompetencias.length > 0 ? (
                      <select
                        value={actividad.competencias}
                        onChange={(e) => updateActividad(idx, "competencias", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Selecciona</option>
                        {actividad.competencias &&
                          !catalogoCompetencias.some(
                            (c) => c.resultadoAprendizaje === actividad.competencias
                          ) && <option value={actividad.competencias}>{actividad.competencias}</option>}
                        {agruparCompetencias(catalogoCompetencias).map(([nombreCompetencia, items]) => (
                          <optgroup key={nombreCompetencia} label={nombreCompetencia}>
                            {items.map((c) => (
                              <option key={c.id} value={c.resultadoAprendizaje}>
                                {c.resultadoAprendizaje}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={actividad.competencias}
                        onChange={(e) => updateActividad(idx, "competencias", e.target.value)}
                        className={inputClass}
                        placeholder={
                          catalogoCompetencias === null ? "Cargando catálogo…" : undefined
                        }
                      />
                    )}
                  </Field>
                  <Field label="Evidencia de cumplimiento">
                    <input
                      value={actividad.evidenciaCumplimiento}
                      onChange={(e) => updateActividad(idx, "evidenciaCumplimiento", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Observaciones">
                    <input
                      value={actividad.observaciones}
                      onChange={(e) => updateActividad(idx, "observaciones", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
          {errors.actividades && (
            <p className="mt-1 text-sm text-red-600">{errors.actividades[0]}</p>
          )}
        </div>

        <FileUploadField
          label="Bitácora diligenciada (adjunto)"
          pathPrefix="bitacora-ep"
          value={form.archivoUrl || null}
          onChange={(url) => update("archivoUrl", url)}
          error={errors.archivoUrl?.[0]}
          required
        />

        {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
        {success && (
          <p className="text-sm text-emerald-700 dark:text-emerald-500">
            Bitácora enviada — queda pendiente de aval del instructor.
          </p>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Enviando…" : initial ? "Actualizar bitácora" : "Enviar bitácora"}
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
