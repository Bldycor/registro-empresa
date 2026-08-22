"use client";

import { useState } from "react";
import {
  ComunaValues,
  comunaLabel,
  CoordinacionValues,
  coordinacionLabel,
  type ComunaValue,
  type CoordinacionValue,
} from "@/lib/validations";
import { StatBadge } from "@/components/stat-badge";

type CreadoPor = { id: string; nombres: string; apellidos: string };

type Coordinador = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  comuna: ComunaValue | null;
  coordinacion: CoordinacionValue | null;
  creadoPorId: string | null;
  creadoPor: CreadoPor | null;
};

type FormFields = {
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  comuna: string;
  coordinacion: string;
};

const initialState: FormFields = {
  nombres: "",
  apellidos: "",
  cedula: "",
  email: "",
  celular: "",
  direccionResidencia: "",
  comuna: "",
  coordinacion: "",
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

export function AdminCoordinadoresPanel({
  initialCoordinadores,
}: {
  initialCoordinadores: Coordinador[];
}) {
  const [coordinadores, setCoordinadores] = useState<Coordinador[]>(initialCoordinadores);
  const [form, setForm] = useState<FormFields>(initialState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ coordinador: Coordinador; password: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    creadas: { nombres: string; apellidos: string; email: string; password: string }[];
    yaExistian: string[];
    errores: { motivo: string }[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(coordinador: Coordinador) {
    setEditingId(coordinador.id);
    setErrors({});
    setCreated(null);
    setUpdated(false);
    setForm({
      nombres: coordinador.nombres,
      apellidos: coordinador.apellidos,
      cedula: coordinador.cedula,
      email: coordinador.email,
      celular: coordinador.celular,
      direccionResidencia: coordinador.direccionResidencia,
      comuna: coordinador.comuna ?? "",
      coordinacion: coordinador.coordinacion ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setErrors({});
    setForm(initialState);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setCreated(null);
    setUpdated(false);
    setLoading(true);

    const res = await fetch(
      editingId ? `/api/admin/coordinadores/${editingId}` : "/api/admin/coordinadores",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErrors(data.error ?? {});
      return;
    }

    if (editingId) {
      setCoordinadores((prev) =>
        prev
          .map((c) => (c.id === editingId ? { ...c, ...data.coordinador } : c))
          .sort((a, b) => a.nombres.localeCompare(b.nombres))
      );
      setUpdated(true);
      setEditingId(null);
      setForm(initialState);
    } else {
      setCoordinadores((prev) =>
        [...prev, data.coordinador].sort((a, b) => a.nombres.localeCompare(b.nombres))
      );
      setCreated({ coordinador: data.coordinador, password: data.password });
      setForm(initialState);
    }
  }

  async function refetchCoordinadores() {
    const res = await fetch("/api/admin/coordinadores");
    if (res.ok) {
      const data = await res.json();
      setCoordinadores(data.coordinadores ?? []);
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    const res = await fetch("/api/admin/coordinadores/import", {
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
    await refetchCoordinadores();
  }

  function askDelete(coordinadorId: string) {
    setDeletingId(coordinadorId);
    setDeleteError(null);
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeleteError(null);
  }

  async function confirmDelete(coordinadorId: string) {
    setDeleteLoading(true);
    setDeleteError(null);

    const res = await fetch(`/api/admin/coordinadores/${coordinadorId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleteLoading(false);

    if (!res.ok) {
      setDeleteError(typeof data.error === "string" ? data.error : "No se pudo eliminar el coordinador.");
      return;
    }

    setCoordinadores((prev) => prev.filter((c) => c.id !== coordinadorId));
    setDeletingId(null);
  }

  return (
    <div className="w-full max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Coordinadores
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Un Coordinador ya no se autoregistra: lo creas tú desde acá. La cuenta nueva queda
          creada con una contraseña temporal que se envía por correo; el coordinador puede
          cambiarla luego de ingresar.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {editingId ? "Editando coordinador" : "Nuevo coordinador"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombres" error={errors.nombres?.[0]}>
            <input
              required
              value={form.nombres}
              onChange={(e) => update("nombres", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Apellidos" error={errors.apellidos?.[0]}>
            <input
              required
              value={form.apellidos}
              onChange={(e) => update("apellidos", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Cédula" error={errors.cedula?.[0]}>
          <input
            required
            value={form.cedula}
            onChange={(e) => update("cedula", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Correo electrónico" error={errors.email?.[0]}>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Celular" error={errors.celular?.[0]}>
          <input
            required
            value={form.celular}
            onChange={(e) => update("celular", e.target.value)}
            className={inputClass}
          />
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
            <select
              required
              value={form.comuna}
              onChange={(e) => update("comuna", e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecciona la comuna
              </option>
              {ComunaValues.map((comuna) => (
                <option key={comuna} value={comuna}>
                  {comunaLabel[comuna]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Coordinación" error={errors.coordinacion?.[0]}>
          <select
            required
            value={form.coordinacion}
            onChange={(e) => update("coordinacion", e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Selecciona la coordinación
            </option>
            {CoordinacionValues.map((coordinacion) => (
              <option key={coordinacion} value={coordinacion}>
                {coordinacionLabel[coordinacion]}
              </option>
            ))}
          </select>
        </Field>

        {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading
            ? editingId
              ? "Guardando cambios..."
              : "Creando coordinador..."
            : editingId
              ? "Guardar cambios"
              : "Crear coordinador"}
        </button>
      </form>

      {created && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <p className="font-medium">
            Coordinador {created.coordinador.nombres} {created.coordinador.apellidos} creado.
          </p>
          <p className="mt-1">
            Contraseña temporal:{" "}
            <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono dark:bg-black/30">
              {created.password}
            </code>{" "}
            (también se envió por correo a {created.coordinador.email}).
          </p>
        </div>
      )}

      {updated && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          Datos del coordinador actualizados.
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
          Pega filas con <strong>NOMBRES</strong>, <strong>APELLIDOS</strong>,{" "}
          <strong>CÉDULA</strong>, <strong>CORREO</strong>, <strong>CELULAR</strong>,{" "}
          <strong>DIRECCIÓN</strong>, <strong>COMUNA</strong> y <strong>COORDINACIÓN</strong>{" "}
          (incluir el encabezado ayuda, pero no es obligatorio). Solo se crean cuentas nuevas —
          si la cédula o el correo ya existen en el sistema, esa fila no se modifica y queda
          listada como &quot;ya existía&quot;.
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
              <StatBadge tono="verde" etiqueta="Creadas" cantidad={importResult.creadas.length} />
              <StatBadge
                tono="ambar"
                etiqueta="Ya existían (sin modificar)"
                cantidad={importResult.yaExistian.length}
              />
              {importResult.errores.length > 0 && (
                <StatBadge tono="rojo" etiqueta="Con errores" cantidad={importResult.errores.length} />
              )}
            </div>

            {importResult.creadas.length > 0 && (
              <details className="rounded-md border border-green-300 bg-green-50 p-3 text-xs text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                <summary className="cursor-pointer font-medium">
                  Ver contraseñas temporales de los {importResult.creadas.length} coordinador(es) creado(s)
                </summary>
                <ul className="mt-2 space-y-1">
                  {importResult.creadas.map((c, i) => (
                    <li key={i}>
                      {c.nombres} {c.apellidos} ({c.email}):{" "}
                      <code className="rounded bg-white/60 px-1 py-0.5 font-mono dark:bg-black/30">
                        {c.password}
                      </code>
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

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {coordinadores.length} coordinador(es) registrado(s)
          </h2>
        </div>
        {coordinadores.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no has registrado ningún coordinador.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {coordinadores.map((coordinador) => {
              const isDeleting = deletingId === coordinador.id;
              return (
                <li key={coordinador.id}>
                  <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {coordinador.nombres} {coordinador.apellidos}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {coordinador.email} · Cédula: {coordinador.cedula}
                      </p>
                      {coordinador.creadoPor && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          Creado por: {coordinador.creadoPor.nombres} {coordinador.creadoPor.apellidos}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {coordinador.coordinacion ? coordinacionLabel[coordinador.coordinacion] : "Sin coordinación"}
                      </span>
                      <div className="mt-1 flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(coordinador)}
                          className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => askDelete(coordinador.id)}
                          className="text-xs font-medium text-red-600 underline hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>

                  {isDeleting && (
                    <div className="space-y-3 border-y border-red-200 bg-red-50 px-6 py-4 dark:border-red-900 dark:bg-red-950/30">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        ¿Eliminar la cuenta de {coordinador.nombres} {coordinador.apellidos}? Esta
                        acción no se puede deshacer.
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400">
                        Se borra su cuenta (login, datos personales, acceso al panel de
                        coordinador). Los instructores o fichas que haya gestionado no se ven
                        afectados.
                      </p>
                      {deleteError && (
                        <p className="text-sm text-red-800 dark:text-red-300">{deleteError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => confirmDelete(coordinador.id)}
                          disabled={deleteLoading}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleteLoading ? "Eliminando..." : "Sí, eliminar coordinador"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelDelete}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
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
