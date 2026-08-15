"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FormFields = {
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  codigoFicha: string;
  password: string;
};

const initialState: FormFields = {
  nombres: "",
  apellidos: "",
  cedula: "",
  email: "",
  celular: "",
  direccionResidencia: "",
  codigoFicha: "",
  password: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(initialState);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormFields>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const res = await fetch("/api/register", {
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

    router.push("/login");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Crear cuenta de aprendiz
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Completa tus datos personales para registrarte.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <Field label="Dirección de residencia" error={errors.direccionResidencia?.[0]}>
            <input
              required
              value={form.direccionResidencia}
              onChange={(e) => update("direccionResidencia", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Código de ficha" error={errors.codigoFicha?.[0]}>
            <input
              required
              value={form.codigoFicha}
              onChange={(e) => update("codigoFicha", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Contraseña" error={errors.password?.[0]}>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={inputClass}
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-50">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
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
