"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recienRegistrado = searchParams.get("registrado") === "1";

  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      cedula,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Cédula o contraseña incorrectos.");
      return;
    }

    router.push("/formulario");
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-sena text-base font-bold text-white"
          >
            SP
          </span>
          <div className="leading-tight">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">SEPA</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              SENA · Seguimiento de Etapa Productiva
            </p>
          </div>
        </div>
        <div className="w-full rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Iniciar sesión
        </h1>

        {recienRegistrado && (
          <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ Cuenta creada correctamente.
            </p>
            <p className="mt-0.5 text-sm text-green-700 dark:text-green-400">
              Ingresa con tu cédula y contraseña para continuar.
            </p>
          </div>
        )}

        {!recienRegistrado && <div className="mb-6" />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="cedula" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Cédula
            </label>
            <input
              id="cedula"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              required
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white dark:hover:bg-sena-oscuro"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline dark:text-zinc-50">
            Regístrate
          </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
