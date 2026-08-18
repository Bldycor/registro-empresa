"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.cedula?.[0] ?? "Ocurrió un error. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }

      // Respuesta siempre genérica (exista o no la cédula), por seguridad.
      setSent(true);
    } catch {
      setError("Ocurrió un error. Inténtalo de nuevo.");
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Recuperar contraseña
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Ingresa tu número de cédula y te enviaremos un enlace al correo registrado en tu cuenta
          para crear una nueva contraseña.
        </p>

        {sent ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ Si la cédula está registrada, enviamos un enlace de recuperación al correo
              asociado a esa cuenta.
            </p>
            <p className="mt-2 text-sm text-green-700 dark:text-green-400">
              Revisa tu bandeja de entrada (y la carpeta de spam). El enlace es válido por 1 hora.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="cedula" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Cédula
              </label>
              <input
                id="cedula"
                type="text"
                inputMode="numeric"
                required
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-50">
            ← Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
