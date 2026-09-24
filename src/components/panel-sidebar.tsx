"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const roleLabel: Record<string, string> = {
  INSTRUCTOR: "Instructor",
  COORDINADOR: "Coordinador de Etapa Productiva",
  ADMIN: "Administrador",
};

type Grupo = { titulo: string; items: { href: string; label: string }[] };

// El menú va agrupado por tarea, no por entidad: cada bloque responde a "qué vengo a hacer".
// Las evidencias que revisa el instructor quedan juntas y en el orden real del proceso
// (alternativa → formalización → bitácoras → evaluaciones → certificación).
const roleNav: Record<string, Grupo[]> = {
  INSTRUCTOR: [
    {
      titulo: "Seguimiento",
      items: [
        { href: "/formulario/instructor/seguimiento", label: "Seguimiento" },
        { href: "/formulario/instructor/aprendices", label: "Aprendices" },
      ],
    },
    {
      titulo: "Evidencias por revisar",
      items: [
        { href: "/formulario/instructor/alternativas", label: "Alternativas EP" },
        { href: "/formulario/instructor/formalizaciones", label: "Formalizaciones" },
        { href: "/formulario/instructor/bitacoras", label: "Bitácoras" },
        { href: "/formulario/instructor/evaluaciones", label: "Evaluaciones" },
        { href: "/formulario/instructor/certificacion", label: "Certificación" },
      ],
    },
    {
      titulo: "Reuniones y novedades",
      items: [
        { href: "/formulario/instructor/extraordinarias", label: "Reuniones extraordinarias" },
        { href: "/formulario/instructor/novedades", label: "Novedades" },
      ],
    },
    { titulo: "Consultas", items: [{ href: "/formulario/reportes", label: "Reportes" }] },
    { titulo: "Cuenta", items: [{ href: "/formulario/instructor/perfil", label: "Mi perfil" }] },
  ],
  COORDINADOR: [
    {
      titulo: "Estructura",
      items: [
        { href: "/formulario/coordinador/fichas", label: "Fichas" },
        { href: "/formulario/coordinador/instructores", label: "Instructores" },
        { href: "/formulario/coordinador/competencias", label: "Competencias" },
      ],
    },
    {
      titulo: "Aprendices",
      items: [
        { href: "/formulario/coordinador/aprendices", label: "Aprendices" },
        { href: "/formulario/coordinador/alternativas", label: "Alternativas EP" },
      ],
    },
    {
      titulo: "Novedades",
      items: [
        { href: "/formulario/coordinador/interrupciones", label: "Interrupciones EP" },
        { href: "/formulario/coordinador/aplazamientos", label: "Aplazamientos EP" },
      ],
    },
    { titulo: "Consultas", items: [{ href: "/formulario/reportes", label: "Reportes" }] },
    { titulo: "Cuenta", items: [{ href: "/formulario/coordinador/perfil", label: "Mi perfil" }] },
  ],
  // ADMIN tiene control total: todo lo del Coordinador, más la gestión de coordinadores.
  ADMIN: [
    {
      titulo: "Estructura",
      items: [
        { href: "/formulario/admin/coordinadores", label: "Coordinadores" },
        { href: "/formulario/coordinador/fichas", label: "Fichas" },
        { href: "/formulario/coordinador/instructores", label: "Instructores" },
        { href: "/formulario/coordinador/competencias", label: "Competencias" },
      ],
    },
    {
      titulo: "Aprendices",
      items: [
        { href: "/formulario/coordinador/aprendices", label: "Aprendices" },
        { href: "/formulario/coordinador/alternativas", label: "Alternativas EP" },
      ],
    },
    {
      titulo: "Novedades",
      items: [
        { href: "/formulario/coordinador/interrupciones", label: "Interrupciones EP" },
        { href: "/formulario/coordinador/aplazamientos", label: "Aplazamientos EP" },
      ],
    },
    { titulo: "Consultas", items: [{ href: "/formulario/reportes", label: "Reportes" }] },
    { titulo: "Cuenta", items: [{ href: "/formulario/coordinador/perfil", label: "Mi perfil" }] },
  ],
};

// Sidebar izquierdo para Instructor/Coordinador/Admin. El Aprendiz ya no usa este componente —
// su navegación es el nav horizontal superior `EvidenciaEPNav` (ver formulario/layout.tsx).
export function PanelSidebar({ role }: { role: string }) {
  const pathname = usePathname();

  const navClass =
    "flex w-full shrink-0 flex-col gap-1 overflow-x-auto border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:sticky sm:top-0 sm:h-screen sm:w-72 sm:overflow-y-auto sm:border-b-0 sm:border-r print:hidden";

  const grupos = roleNav[role] ?? [];

  return (
    <nav className={navClass}>
      <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {roleLabel[role] ?? role}
      </p>
      {grupos.map((grupo) => (
        <div key={grupo.titulo} className="flex flex-col gap-1">
          <p className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            {grupo.titulo}
          </p>
          {grupo.items.map((item) => {
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
        </div>
      ))}
    </nav>
  );
}
