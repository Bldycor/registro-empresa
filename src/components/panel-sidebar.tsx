"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const roleLabel: Record<string, string> = {
  INSTRUCTOR: "Instructor",
  COORDINADOR: "Coordinador",
  ADMIN: "Administrador",
};

const roleNav: Record<string, { href: string; label: string }[]> = {
  INSTRUCTOR: [
    { href: "/formulario/instructor/aprendices", label: "Aprendices" },
    { href: "/formulario/instructor/formalizaciones", label: "Formalizaciones" },
  ],
  COORDINADOR: [
    { href: "/formulario/coordinador/fichas", label: "Fichas" },
    { href: "/formulario/coordinador/instructores", label: "Instructores" },
    { href: "/formulario/coordinador/aprendices", label: "Aprendices" },
    { href: "/formulario/coordinador/alternativas", label: "Alternativas EP" },
  ],
  // ADMIN tiene control total: todo lo del Coordinador, más la gestión de coordinadores.
  ADMIN: [
    { href: "/formulario/admin/coordinadores", label: "Coordinadores" },
    { href: "/formulario/coordinador/fichas", label: "Fichas" },
    { href: "/formulario/coordinador/instructores", label: "Instructores" },
    { href: "/formulario/coordinador/aprendices", label: "Aprendices" },
    { href: "/formulario/coordinador/alternativas", label: "Alternativas EP" },
  ],
};

// Sidebar izquierdo para Instructor/Coordinador/Admin. El Aprendiz ya no usa este componente —
// su navegación es el nav horizontal superior `EvidenciaEPNav` (ver formulario/layout.tsx).
export function PanelSidebar({ role }: { role: string }) {
  const pathname = usePathname();

  const navClass =
    "flex w-full shrink-0 flex-col gap-1 overflow-x-auto border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:sticky sm:top-0 sm:h-screen sm:w-72 sm:overflow-y-auto sm:border-b-0 sm:border-r";

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

export function ExitProcessButton() {
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
