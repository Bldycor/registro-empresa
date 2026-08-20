"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { ProcesoStep } from "@/lib/etapa-productiva-steps";

const roleLabel: Record<string, string> = {
  INSTRUCTOR: "Instructor",
  COORDINADOR: "Coordinador",
  ADMIN: "Administrador",
};

const roleNav: Record<string, { href: string; label: string }[]> = {
  INSTRUCTOR: [{ href: "/formulario/instructor/aprendices", label: "Aprendices" }],
  COORDINADOR: [
    { href: "/formulario/coordinador/fichas", label: "Fichas" },
    { href: "/formulario/coordinador/instructores", label: "Instructores" },
    { href: "/formulario/coordinador/aprendices", label: "Aprendices" },
  ],
  // ADMIN tiene control total: todo lo del Coordinador, más la gestión de coordinadores.
  ADMIN: [
    { href: "/formulario/admin/coordinadores", label: "Coordinadores" },
    { href: "/formulario/coordinador/fichas", label: "Fichas" },
    { href: "/formulario/coordinador/instructores", label: "Instructores" },
    { href: "/formulario/coordinador/aprendices", label: "Aprendices" },
  ],
};

export function PanelSidebar({ steps, role }: { steps: ProcesoStep[]; role: string }) {
  const pathname = usePathname();

  const navClass =
    "flex w-full shrink-0 flex-col gap-1 overflow-x-auto border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:sticky sm:top-0 sm:h-screen sm:w-72 sm:overflow-y-auto sm:border-b-0 sm:border-r";

  if (role !== "APRENDIZ") {
    const items = roleNav[role] ?? [];
    return (
      <nav className={navClass}>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {roleLabel[role] ?? role}
        </p>
        {items.map((item) => {
          const active = pathname?.startsWith(item.href) ?? false;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <ExitProcessButton />
      </nav>
    );
  }

  return (
    <nav className={navClass}>
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        Etapa Productiva
      </p>

      {steps.map((step, index) => {
        const numero = index + 1;

        if (step.status === "bloqueado") {
          return (
            <div
              key={step.key}
              title="Completa el paso anterior para desbloquear este proceso."
              className="flex cursor-not-allowed items-start gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
            >
              <StepBadge numero={numero} status={step.status} />
              <div>
                <p className="font-medium">{step.label}</p>
                <p className="text-xs">Bloqueado — completa el paso anterior.</p>
              </div>
            </div>
          );
        }

        const active = pathname?.startsWith(step.href) ?? false;

        return (
          <Link
            key={step.key}
            href={step.href}
            className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <StepBadge numero={numero} status={step.status} inverted={active} />
            <div>
              <p className="font-medium">{step.label}</p>
              <p className={`text-xs ${active ? "opacity-80" : "text-zinc-500 dark:text-zinc-400"}`}>
                {step.status === "completo" ? "Completado" : "Pendiente"}
              </p>
            </div>
          </Link>
        );
      })}

      <ExitProcessButton />
    </nav>
  );
}

function ExitProcessButton() {
  return (
    <div className="mt-3 flex flex-col gap-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        ← Salir del proceso
      </button>
    </div>
  );
}

function StepBadge({
  numero,
  status,
  inverted,
}: {
  numero: number;
  status: ProcesoStep["status"];
  inverted?: boolean;
}) {
  if (status === "completo") {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
        ✓
      </span>
    );
  }

  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
        inverted
          ? "border-white text-white dark:border-zinc-900 dark:text-zinc-900"
          : "border-zinc-400 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
      }`}
    >
      {numero}
    </span>
  );
}
