"use client";

import { useState } from "react";
import { ComunaValues, comunaLabel, type ComunaValue } from "@/lib/validations";

// Cuentas de Coordinación de Formación (26 oct 2026): rol de solo consulta que crea y corrige
// únicamente el administrador. Sin «coordinación» asignada: consulta todo el centro.

type Cuenta = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  comuna: ComunaValue | null;
  creadoPor: { nombres: string; apellidos: string } | null;
};

const VACIO = { nombres: "", apellidos: "", cedula: "", email: "", celular: "", direccionResidencia: "", comuna: "" };
type Campos = typeof VACIO;

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

export function AdminCoordinacionFormacionPanel({ iniciales }: { iniciales: Cuenta[] }) {
  const [cuentas, setCuentas] = useState<Cuenta[]>(iniciales);
  const [form, setForm] = useState<Campos>(VACIO);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; password?: string } | null>(null);

  function cambiar(campo: keyof Campos, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function editar(c: Cuenta) {
    setEditandoId(c.id);
    setErrores({});
    setAviso(null);
    setForm({
      nombres: c.nombres,
      apellidos: c.apellidos,
      cedula: c.cedula,
      email: c.email,
      celular: c.celular,
      direccionResidencia: c.direccionResidencia,
      comuna: c.comuna ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelar() {
    setEditandoId(null);
    setErrores({});
    setForm(VACIO);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErrores({});
    setAviso(null);
    setGuardando(true);
    const res = await fetch(
      editandoId ? `/api/admin/coordinacion-formacion/${editandoId}` : "/api/admin/coordinacion-formacion",
      { method: editandoId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
    );
    const data = await res.json().catch(() => ({}));
    setGuardando(false);

    if (!res.ok) {
      setErrores(data.error ?? { _root: ["No se pudo guardar la cuenta."] });
      return;
    }

    const cuenta: Cuenta = data.cuenta;
    if (editandoId) {
      setCuentas((prev) => prev.map((c) => (c.id === cuenta.id ? cuenta : c)));
      setAviso({ texto: `Datos de ${cuenta.nombres} ${cuenta.apellidos} actualizados.` });
    } else {
      setCuentas((prev) => [...prev, cuenta].sort((a, b) => a.nombres.localeCompare(b.nombres)));
      setAviso({
        texto: `Cuenta creada para ${cuenta.nombres} ${cuenta.apellidos}. Ingresa con su cédula y esta contraseña temporal, que también le llegó por correo:`,
        password: data.password,
      });
    }
    setEditandoId(null);
    setForm(VACIO);
  }

  return (
    <div className="w-full max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Coordinación de Formación</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cuentas de solo consulta para el Coordinador del Grupo de Formación Integral: ven el tablero de
          indicadores, los reportes, la gestión de instructores y las funciones en la empresa. No avalan ni
          modifican nada.
        </p>
      </div>

      {aviso && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <p>{aviso.texto}</p>
          {aviso.password && <p className="mt-2 font-mono text-base font-semibold">{aviso.password}</p>}
        </div>
      )}

      <form
        onSubmit={enviar}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {editandoId ? "Editando cuenta" : "Nueva cuenta"}
          </h2>
          {editandoId && (
            <button
              type="button"
              onClick={cancelar}
              className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombres" error={errores.nombres?.[0]}>
            <input required value={form.nombres} onChange={(e) => cambiar("nombres", e.target.value)} className={inputClass} />
          </Campo>
          <Campo etiqueta="Apellidos" error={errores.apellidos?.[0]}>
            <input required value={form.apellidos} onChange={(e) => cambiar("apellidos", e.target.value)} className={inputClass} />
          </Campo>
          <Campo etiqueta="Cédula" error={errores.cedula?.[0]}>
            <input required value={form.cedula} onChange={(e) => cambiar("cedula", e.target.value)} className={inputClass} />
          </Campo>
          <Campo etiqueta="Correo electrónico" error={errores.email?.[0]}>
            <input type="email" required value={form.email} onChange={(e) => cambiar("email", e.target.value)} className={inputClass} />
          </Campo>
          <Campo etiqueta="Celular" error={errores.celular?.[0]}>
            <input required value={form.celular} onChange={(e) => cambiar("celular", e.target.value)} className={inputClass} />
          </Campo>
          <Campo etiqueta="Comuna" error={errores.comuna?.[0]}>
            <select required value={form.comuna} onChange={(e) => cambiar("comuna", e.target.value)} className={inputClass}>
              <option value="" disabled>
                Selecciona
              </option>
              {ComunaValues.map((c) => (
                <option key={c} value={c}>
                  {comunaLabel[c]}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Dirección de residencia" error={errores.direccionResidencia?.[0]}>
          <input
            required
            value={form.direccionResidencia}
            onChange={(e) => cambiar("direccionResidencia", e.target.value)}
            className={inputClass}
          />
        </Campo>

        {errores._root && <p className="text-sm text-red-600">{errores._root[0]}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-fit rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50"
        >
          {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Crear cuenta"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Cuentas creadas ({cuentas.length})
        </h2>
        {cuentas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Todavía no hay cuentas de Coordinación de Formación.
          </p>
        ) : (
          <ul className="space-y-2">
            {cuentas.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {c.nombres} {c.apellidos}{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">· CC {c.cedula}</span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {c.email} · {c.celular}
                    {c.creadoPor && ` · creada por ${c.creadoPor.nombres} ${c.creadoPor.apellidos}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => editar(c)}
                  className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Editar
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Para cambiar la contraseña de una de estas cuentas usa «Contraseñas».
        </p>
      </section>
    </div>
  );
}

function Campo({ etiqueta, error, children }: { etiqueta: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{etiqueta}</label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
