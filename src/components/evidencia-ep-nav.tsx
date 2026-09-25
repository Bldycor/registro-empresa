"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ayudaMenu } from "@/lib/ayuda";

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
  // Novedades de la etapa productiva (guía §9.2). No es una evidencia: no lleva insignia.
  {
    href: "/formulario/etapa-productiva/novedades",
    label: "Novedades",
    icon: "📌",
    key: null,
  },
  // Todo el proceso en una sola vista, para consultarlo o guardarlo en PDF. No lleva insignia.
  {
    href: "/formulario/etapa-productiva/expediente",
    label: "Expediente",
    icon: "🗂️",
    key: null,
  },
  { href: "/formulario/ayuda", label: "Ayuda", icon: "❓", key: null },
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
  const ayudaActiva = TABS.find((t) => pathname?.startsWith(t.href))
    ? ayudaMenu[TABS.find((t) => pathname?.startsWith(t.href))!.href]?.resumen
    : null;

  return (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 print:hidden">
      <div className="flex items-center justify-between gap-4 px-4 pt-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sena">
            Panel del aprendiz
          </p>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Gestión de Evidencia de Etapa Productiva
          </h1>
        </div>
        <div className="hidden shrink-0 sm:block">
          <Link
            href="/formulario/actualizar"
            className={`mr-2 inline-block rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              pathname === "/formulario/actualizar"
                ? "bg-sena text-white dark:bg-sena dark:text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-sena-oscuro"
            }`}
          >
            Mi perfil
          </Link>
        </div>
      </div>

      <nav className="mt-3 flex gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href) ?? false;
          const enAlerta = tab.key ? (alertas?.[tab.key] ?? 0) : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={ayudaMenu[tab.href]?.resumen}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-sena text-white dark:bg-sena dark:text-white"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-sena-oscuro"
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

      {/* Qué se hace en la pestaña abierta: la misma frase que el menú lateral muestra al
          instructor y a Coordinación (ver src/lib/ayuda.ts). */}
      {ayudaActiva && (
        <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:px-6">
          {ayudaActiva}
        </p>
      )}
    </div>
  );
}
