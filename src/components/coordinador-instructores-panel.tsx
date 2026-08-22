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

type Ficha = { id: string; codigo: string };
type CreadoPor = { id: string; nombres: string; apellidos: string };

type Instructor = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  comuna: ComunaValue | null;
  coordinacion: CoordinacionValue | null;
  fichasAsignadas: Ficha[];
  creadoPorId?: string | null;
  creadoPor?: CreadoPor | null;
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

export function CoordinadorInstructoresPanel({
  initialInstructores,
}: {
  initialInstructores: Instructor[];
}) {
  const [instructores, setInstructores] = useState<Instructor[]>(initialInstructores);
  const [form, setForm] = useState<FormFields>(initialState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ instructor: Instructor; password: string } | null>(null);
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

  function startEdit(instructor: Instructor) {
    setEditingId(instructor.id);
    setErrors({});
    setCreated(null);
    setUpdated(false);
    setForm({
      nombres: instructor.nombres,
      apellidos: instructor.apellidos,
      cedula: instructor.cedula,
      email: instructor.email,
      celular: instructor.celular,
      direccionResidencia: instructor.direccionResidencia,
      comuna: instructor.comuna ?? "",
      coordinacion: instructor.coordinacion ?? "",
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
      editingId ? `/api/coordinador/instructores/${editingId}` : "/api/coordinador/instructores",
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
      setInstructores((prev) =>
        prev
          .map((i) => (i.id === editingId ? { ...i, ...data.instructor } : i))
          .sort((a, b) => a.nombres.localeCompare(b.nombres))
      );
      setUpdated(true);
      setEditingId(null);
      setForm(initialState);
    } else {
      const nuevo: Instructor = { ...data.instructor, fichasAsignadas: [] };
      setInstructores((prev) =>
        [...prev, nuevo].sort((a, b) => a.nombres.localeCompare(b.nombres))
      );
      setCreated({ instructor: nuevo, password: data.password });
      setForm(initialState);
    }
  }

  async function refetchInstructores() {
    const res = await fetch("/api/coordinador/instructores");
    if (res.ok) {
      const data = await res.json();
      setInstructores(
        (data.instructores ?? []).map((i: Instructor) => ({ ...i, fichasAsignadas: i.fichasAsignadas ?? [] }))
      );
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    const res = await fetch("/api/coordinador/instructores/import", {
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
    await refetchInstructores();
  }

  function askDelete(instructorId: string) {
    setDeletingId(instructorId);
    setDeleteError(null);
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeleteError(null);
  }

  async function confirmDelete(instructorId: string) {
    setDeleteLoading(true);
    setDeleteError(null);

    const res = await fetch(`/api/coordinador/instructores/${instructorId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleteLoading(false);

    if (!res.ok) {
      setDeleteError(typeof data.error === "string" ? data.error : "No se pudo eliminar el instructor.");
      return;
    }

    setInstructores((prev) => prev.filter((i) => i.id !== instructorId));
    setDeletingId(null);
  }

  return (
    <div className="w-full max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Instructores
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Registra los instructores a tu cargo, o edita los datos de uno ya creado. La cuenta
          nueva queda creada con una contraseña temporal que se envía por correo; el instructor
          puede cambiarla luego de ingresar.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {editingId ? "Editando instructor" : "Nuevo instructor"}
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
              : "Creando instructor..."
            : editingId
              ? "Guardar cambios"
              : "Crear instructor"}
        </button>
      </form>

      {created && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <p className="font-medium">
            Instructor {created.instructor.nombres} {created.instructor.apellidos} creado.
          </p>
          <p className="mt-1">
            Contraseña temporal:{" "}
            <code className="rounded bg-white/60 px-1.5 py-0.5 font-mono dark:bg-black/30">
              {created.password}
            </code>{" "}
            (también se envió por correo a {created.instructor.email}).
          </p>
        </div>
      )}

      {updated && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          Datos del instructor actualizados.
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
          listada como &quot;ya existía&quot;. Cada cuenta nueva recibe una contraseña temporal
          por correo.
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
                  Ver contraseñas temporales de los {importResult.creadas.length} instructor(es) creado(s)
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
            {instructores.length} instructor(es) registrado(s)
          </h2>
        </div>
        {instructores.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no has registrado ningún instructor.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {instructores.map((instructor) => {
              const isDeleting = deletingId === instructor.id;
              return (
                <li key={instructor.id}>
                  <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {instructor.nombres} {instructor.apellidos}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {instructor.email} · Cédula: {instructor.cedula}
                      </p>
                      {instructor.creadoPor && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          Creado por: {instructor.creadoPor.nombres} {instructor.creadoPor.apellidos}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {instructor.coordinacion ? coordinacionLabel[instructor.coordinacion] : "Sin coordinación"}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {instructor.fichasAsignadas.length > 0
                          ? `Fichas: ${instructor.fichasAsignadas.map((f) => f.codigo).join(", ")}`
                          : "Sin fichas asignadas"}
                      </span>
                      <div className="mt-1 flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(instructor)}
                          className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => askDelete(instructor.id)}
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
                        ¿Eliminar la cuenta de {instructor.nombres} {instructor.apellidos}? Esta
                        acción no se puede deshacer.
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400">
                        Se borra su cuenta (login, datos personales).
                        {instructor.fichasAsignadas.length > 0 && (
                          <>
                            {" "}
                            Tiene {instructor.fichasAsignadas.length} ficha(s) asignada(s):{" "}
                            <strong>no se eliminan</strong>, solo quedan sin instructor asignado.
                          </>
                        )}
                      </p>
                      {deleteError && (
                        <p className="text-sm text-red-800 dark:text-red-300">{deleteError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => confirmDelete(instructor.id)}
                          disabled={deleteLoading}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleteLoading ? "Eliminando..." : "Sí, eliminar instructor"}
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
