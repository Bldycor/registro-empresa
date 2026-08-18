"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          data?.error?._root?.[0] ??
            data?.error?.password?.[0] ??
            "No se pudo restablecer la contraseña. Inténtalo de nuevo."
        );
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Ocurrió un error. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-900/20">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Este enlace no es válido. Solicita uno nuevo desde{" "}
          <Link href="/forgot-password" className="underline">
            recuperar contraseña
          </Link>
          .
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-900/20">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          ✓ Contraseña actualizada correctamente. Te llevamos a iniciar sesión...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Confirma la nueva contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Crear nueva contraseña
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Elige una nueva contraseña de al menos 8 caracteres.
        </p>

        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-50">
            ← Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
