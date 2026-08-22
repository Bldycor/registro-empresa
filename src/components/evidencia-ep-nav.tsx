"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const TABS = [
  { href: "/formulario/etapa-productiva/alternativa", label: "Alternativa EP", icon: "📋" },
  { href: "/formulario/etapa-productiva/formalizacion", label: "Formalización", icon: "📄" },
  { href: "/formulario/etapa-productiva/bitacoras", label: "Bitácoras", icon: "📓" },
  { href: "/formulario/etapa-productiva/evaluaciones", label: "Evaluaciones", icon: "✅" },
  { href: "/formulario/etapa-productiva/certificacion", label: "Certificación", icon: "🏁" },
];

// Nav horizontal del panel del Aprendiz — reemplaza el sidebar izquierdo (stepper) que existía
// antes de Fase 2. Las 5 evidencias son secciones del mismo nivel, sin bloqueo secuencial estricto
// (a diferencia del stepper anterior): el aprendiz puede moverse libremente entre ellas.
export function EvidenciaEPNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4 px-4 pt-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Panel del aprendiz
          </p>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Gestión de Evidencia de Etapa Productiva
          </h1>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="hidden shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 sm:block dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ← Salir
        </button>
      </div>

      <nav className="mt-3 flex gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href) ?? false;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
