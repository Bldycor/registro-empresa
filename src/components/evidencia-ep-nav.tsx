"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type AlertasPorEvidencia = {
  alternativa: number;
  formalizacion: number;
  bitacoras: number;
  evaluaciones: number;
  certificacion: number;
};

const TABS = [
  {
    href: "/formulario/etapa-productiva/alternativa",
    label: "Alternativa EP",
    icon: "📋",
    key: "alternativa" as const,
  },
  {
    href: "/formulario/etapa-productiva/formalizacion",
    label: "Formalización",
    icon: "📄",
    key: "formalizacion" as const,
  },
  {
    href: "/formulario/etapa-productiva/bitacoras",
    label: "Bitácoras",
    icon: "📓",
    key: "bitacoras" as const,
  },
  {
    href: "/formulario/etapa-productiva/evaluaciones",
    label: "Evaluaciones",
    icon: "✅",
    key: "evaluaciones" as const,
  },
  {
    href: "/formulario/etapa-productiva/certificacion",
    label: "Certificación",
    icon: "🏁",
    key: "certificacion" as const,
  },
];

// Nav horizontal del panel del Aprendiz — reemplaza el sidebar izquierdo (stepper) que existía
// antes de Fase 2. Las 5 evidencias son secciones del mismo nivel, sin bloqueo secuencial estricto
// (a diferencia del stepper anterior): el aprendiz puede moverse libremente entre ellas.
// `alertas` marca con una insignia roja cuántas evidencias de cada sección están Rechazadas o
// Atrasadas (vencidas sin diligenciar, según la fecha real de inicio/fin de su Etapa Productiva
// — ver src/lib/seguimiento-evidencias.ts), para que el aprendiz note de un vistazo dónde debe
// actuar sin tener que entrar a cada pestaña.
export function EvidenciaEPNav({ alertas }: { alertas?: AlertasPorEvidencia }) {
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
          const enAlerta = alertas?.[tab.key] ?? 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <span aria-hidden>{tab.icon}</span>
              {tab.label}
              {enAlerta > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900"
                  title={`${enAlerta} evidencia(s) rechazada(s) o atrasada(s) — revisa y actúa`}
                >
                  {enAlerta}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
