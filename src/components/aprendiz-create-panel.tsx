"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatBadge } from "@/components/stat-badge";
import {
  ComunaValues,
  comunaLabel,
  AlternativaEtapaProductivaValues,
  alternativaEtapaProductivaLabel,
} from "@/lib/validations";

type Ficha = { id: string; codigo: string };

type FormFields = {
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  comuna: string;
  fichaId: string;
  alternativaEtapaProductiva: string;
};

const initialState: FormFields = {
  nombres: "",
  apellidos: "",
  cedula: "",
  email: "",
  celular: "",
  direccionResidencia: "",
  comuna: "",
  fichaId: "",
  alternativaEtapaProductiva: "",
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// Formulario de creación de aprendiz (individual + importación masiva), compartido por los
// paneles de Instructor, Coordinador y Admin. La única diferencia real entre roles es el alcance
// de fichas disponibles (el Instructor solo ve las suyas, verificado en el route handler) — todo
// lo demás es idéntico, por eso vive en un solo componente parametrizado por URL.
export function AprendizCreatePanel({
  fichas,
  createUrl,
  importUrl,
  sinFichasMensaje,
  restriccionFichaTexto,
  onCreated,
}: {
  fichas: Ficha[];
  createUrl: string;
  importUrl: string;
  sinFichasMensaje: string;
  restriccionFichaTexto: string;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(initialState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ nombres: string; apellidos: string; email: string; password: string } | null>(null);

  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    creadas: { nombres: string; apellidos: string; email: string; password: string }[];
    yaExistian: string[];
    errores: { motivo: string }[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function notifyCreated() {
    if (onCreated) {
      onCreated();
    } else {
      router.refresh();
    }
  }

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setCreated(null);
    setLoading(true);

    const res = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErrors(data.error ?? {});
      return;
    }

    setCreated({
      nombres: data.aprendiz.nombres,
      apellidos: data.aprendiz.apellidos,
      email: data.aprendiz.email,
      password: data.password,
    });
    setForm(initialState);
    notifyCreated();
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    const res = await fetch(importUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: importText }),
    });

    const data = await res.json();
    setImportLoading(false);

    if (!res.ok) {
      setImportError(data.error ?? "No se pudo importar el contenido pegado.");
      return;
    }

    setImportResult(data);
    setImportText("");
    notifyCreated();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nuevo aprendiz</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombres" error={errors.nombres?.[0]}>
            <input required value={form.nombres} onChange={(e) => update("nombres", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Apellidos" error={errors.apellidos?.[0]}>
            <input required value={form.apellidos} onChange={(e) => update("apellidos", e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="Cédula" error={errors.cedula?.[0]}>
          <input required value={form.cedula} onChange={(e) => update("cedula", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Correo electrónico" error={errors.email?.[0]}>
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </Field>

        <Field label="Celular" error={errors.celular?.[0]}>
          <input required value={form.celular} onChange={(e) => update("celular", e.target.value)} className={inputClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Dirección de residencia" error={errors.direccionResidencia?.[0]}>
            <input
              required
              value={form.direccionResidencia}
              onChange={(e) => update("direccionResidencia", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Comuna" error={errors.comuna?.[0]}>
            <select required value={form.comuna} onChange={(e) => update("comuna", e.target.value)} className={inputClass}>
              <option value="" disabled>Selecciona la comuna</option>
              {ComunaValues.map((c) => (
                <option key={c} value={c}>{comunaLabel[c]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Ficha" error={errors.fichaId?.[0]}>
            {fichas.length === 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-500">{sinFichasMensaje}</p>
            ) : (
              <select required value={form.fichaId} onChange={(e) => update("fichaId", e.target.value)} className={inputClass}>
                <option value="" disabled>Selecciona la ficha</option>
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>{f.codigo}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Alternativa de Etapa Productiva" error={errors.alternativaEtapaProductiva?.[0]}>
            <select
              required
              value={form.alternativaEtapaProductiva}
              onChange={(e) => update("alternativaEtapaProductiva", e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>Selecciona la alternativa</option>
              {AlternativaEtapaProductivaValues.map((a) => (
                <option key={a} value={a}>{alternativaEtapaProductivaLabel[a]}</option>
              ))}
            </select>
          </Field>
        </div>

        {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}

        <button
          type="submit"
          disabled={loading || fichas.length === 0}
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Creando aprendiz..." : "Crear aprendiz"}
        </button>
      </form>

      {created && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <p className="font-medium">Aprendiz {created.nombres} {created.apellidos} creado.</p>
          <p className="mt-1">
            Contraseña temporal:{" "}
            <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono dark:bg-black/30">{created.password}</code>{" "}
            (también se envió por correo a {created.email}).
          </p>
        </div>
      )}

      <form
        onSubmit={handleImportSubmit}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Importar desde hoja de cálculo
        </label>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Pega filas con <strong>DOCUMENTO</strong>, <strong>NOMBRES</strong>,{" "}
          <strong>APELLIDOS</strong>, <strong>TELÉFONO</strong>, <strong>CORREO</strong>,{" "}
          <strong>FICHA</strong> y <strong>ALTERNATIVA EP</strong> (incluir el encabezado ayuda,
          pero no es obligatorio; las columnas de <strong>PROGRAMA DE FORMACIÓN</strong> e{" "}
          <strong>INSTRUCTOR</strong> se ignoran, ya viven en la ficha). Solo se crean cuentas
          nuevas — si la cédula o el correo ya existen, o {restriccionFichaTexto}, esa fila no se
          modifica y queda reportada aparte. Cada cuenta nueva recibe una contraseña temporal por
          correo.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          placeholder="Pega aquí las filas copiadas de la hoja de cálculo"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
        {importResult && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <StatBadge tono="verde" etiqueta="Creados" cantidad={importResult.creadas.length} />
              <StatBadge tono="ambar" etiqueta="Ya existían / no válidos" cantidad={importResult.yaExistian.length} />
              {importResult.errores.length > 0 && (
                <StatBadge tono="rojo" etiqueta="Con errores" cantidad={importResult.errores.length} />
              )}
            </div>

            {importResult.creadas.length > 0 && (
              <details className="rounded-md border border-green-300 bg-green-50 p-3 text-xs text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                <summary className="cursor-pointer font-medium">
                  Ver contraseñas temporales de los {importResult.creadas.length} aprendiz(ces) creado(s)
                </summary>
                <ul className="mt-2 space-y-1">
                  {importResult.creadas.map((c, i) => (
                    <li key={i}>
                      {c.nombres} {c.apellidos} ({c.email}):{" "}
                      <code className="rounded bg-white/60 px-1 py-0.5 font-mono dark:bg-black/30">{c.password}</code>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {importResult.yaExistian.length > 0 && (
              <details className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <summary className="cursor-pointer font-medium">
                  Ver los {importResult.yaExistian.length} que ya existían
                </summary>
                <p className="mt-2">{importResult.yaExistian.join(", ")}</p>
              </details>
            )}

            {importResult.errores.length > 0 && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <p className="font-medium">Filas que no se pudieron importar:</p>
                <ul className="mt-1 list-disc pl-4">
                  {importResult.errores.map((e, i) => (
                    <li key={i}>{e.motivo}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={importLoading || importText.trim().length === 0}
          className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {importLoading ? "Importando..." : "Importar"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
