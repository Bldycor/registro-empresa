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

type Ficha = { id: string; codigo: string };

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
            {instructores.map((instructor) => (
              <li
                key={instructor.id}
                className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {instructor.nombres} {instructor.apellidos}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {instructor.email} · Cédula: {instructor.cedula}
                  </p>
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
                  <button
                    type="button"
                    onClick={() => startEdit(instructor)}
                    className="mt-1 text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Editar
                  </button>
                </div>
              </li>
            ))}
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
