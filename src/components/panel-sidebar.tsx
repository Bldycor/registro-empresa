"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ayudaMenu } from "@/lib/ayuda";

const roleLabel: Record<string, string> = {
  INSTRUCTOR: "Instructor",
  COORDINADOR: "Coordinador de Etapa Productiva",
  ADMIN: "Administrador",
};

type Grupo = { titulo: string; icono: string; items: { href: string; label: string }[] };

// El menú va agrupado por tarea, no por entidad: cada bloque responde a "qué vengo a hacer".
// Los grupos se pliegan para que la lista quepa de un vistazo: se abre solo el que contiene la
// página actual, y el usuario puede abrir o cerrar los demás.
const roleNav: Record<string, Grupo[]> = {
  INSTRUCTOR: [
    {
      titulo: "Seguimiento",
      icono: "🚦",
      items: [
        { href: "/formulario/instructor/seguimiento", label: "Seguimiento" },
        { href: "/formulario/instructor/aprendices", label: "Aprendices" },
      ],
    },
    {
      titulo: "Evidencias por revisar",
      icono: "🗂️",
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
      icono: "📅",
      items: [
        { href: "/formulario/instructor/extraordinarias", label: "Reuniones extraordinarias" },
        { href: "/formulario/instructor/novedades", label: "Novedades" },
      ],
    },
    { titulo: "Consultas", icono: "📊", items: [{ href: "/formulario/reportes", label: "Reportes" }] },
    {
      titulo: "Ayuda y cuenta",
      icono: "❓",
      items: [
        { href: "/formulario/ayuda", label: "Guía de uso" },
        { href: "/formulario/instructor/perfil", label: "Mi perfil" },
      ],
    },
  ],
  COORDINADOR: [
    {
      titulo: "Estructura",
      icono: "🗃️",
      items: [
        { href: "/formulario/coordinador/fichas", label: "Fichas" },
        { href: "/formulario/coordinador/instructores", label: "Instructores" },
        { href: "/formulario/coordinador/competencias", label: "Competencias" },
      ],
    },
    {
      titulo: "Aprendices",
      icono: "🎓",
      items: [
        { href: "/formulario/coordinador/aprendices", label: "Aprendices" },
        { href: "/formulario/coordinador/alternativas", label: "Alternativas EP" },
      ],
    },
    {
      titulo: "Novedades",
      icono: "📌",
      items: [
        { href: "/formulario/coordinador/interrupciones", label: "Interrupciones EP" },
        { href: "/formulario/coordinador/aplazamientos", label: "Aplazamientos EP" },
      ],
    },
    { titulo: "Consultas", icono: "📊", items: [{ href: "/formulario/reportes", label: "Reportes" }] },
    {
      titulo: "Ayuda y cuenta",
      icono: "❓",
      items: [
        { href: "/formulario/ayuda", label: "Guía de uso" },
        { href: "/formulario/coordinador/perfil", label: "Mi perfil" },
      ],
    },
  ],
  // ADMIN tiene control total: todo lo del Coordinador, más la gestión de coordinadores.
  ADMIN: [
    {
      titulo: "Estructura",
      icono: "🗃️",
      items: [
        { href: "/formulario/admin/coordinadores", label: "Coordinadores" },
        { href: "/formulario/coordinador/fichas", label: "Fichas" },
        { href: "/formulario/coordinador/instructores", label: "Instructores" },
        { href: "/formulario/coordinador/competencias", label: "Competencias" },
      ],
    },
    {
      titulo: "Aprendices",
      icono: "🎓",
      items: [
        { href: "/formulario/coordinador/aprendices", label: "Aprendices" },
        { href: "/formulario/coordinador/alternativas", label: "Alternativas EP" },
      ],
    },
    {
      titulo: "Novedades",
      icono: "📌",
      items: [
        { href: "/formulario/coordinador/interrupciones", label: "Interrupciones EP" },
        { href: "/formulario/coordinador/aplazamientos", label: "Aplazamientos EP" },
      ],
    },
    { titulo: "Consultas", icono: "📊", items: [{ href: "/formulario/reportes", label: "Reportes" }] },
    {
      titulo: "Ayuda y cuenta",
      icono: "❓",
      items: [
        { href: "/formulario/ayuda", label: "Guía de uso" },
        { href: "/formulario/coordinador/perfil", label: "Mi perfil" },
      ],
    },
  ],
};

// Sidebar izquierdo para Instructor/Coordinador/Admin. El Aprendiz usa el nav horizontal superior
// (`EvidenciaEPNav`, ver formulario/layout.tsx).
export function PanelSidebar({ role }: { role: string }) {
  const pathname = usePathname() ?? "";
  const grupos = roleNav[role] ?? [];
  const grupoActivo = grupos.find((g) => g.items.some((i) => pathname.startsWith(i.href)))?.titulo;

  // Por defecto se abre el grupo de la página actual y los demás quedan plegados; lo que el
  // usuario abra o cierre a mano se guarda aquí y manda sobre ese valor por defecto, mientras
  // dure la visita.
  const [alternados, setAlternados] = useState<Record<string, boolean>>({});
  const estaAbierto = (titulo: string) => alternados[titulo] ?? titulo === grupoActivo;

  function alternar(titulo: string) {
    setAlternados((prev) => ({ ...prev, [titulo]: !(prev[titulo] ?? titulo === grupoActivo) }));
  }

  return (
    <nav className="flex w-full shrink-0 flex-col gap-1 border-b border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:sticky sm:top-0 sm:h-screen sm:w-72 sm:overflow-y-auto sm:border-b-0 sm:border-r print:hidden">
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {roleLabel[role] ?? role}
      </p>

      {grupos.map((grupo) => {
        const abierto = estaAbierto(grupo.titulo);
        const tieneActivo = grupo.titulo === grupoActivo;
        return (
          <div key={grupo.titulo} className="flex flex-col">
            <button
              type="button"
              onClick={() => alternar(grupo.titulo)}
              aria-expanded={abierto}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors ${
                tieneActivo
                  ? "text-sena"
                  : "text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
              }`}
            >
              <span aria-hidden className="text-base">
                {grupo.icono}
              </span>
              <span className="flex-1">{grupo.titulo}</span>
              <span
                aria-hidden
                className={`text-[10px] text-zinc-400 transition-transform ${abierto ? "rotate-90" : ""}`}
              >
                ▶
              </span>
            </button>

            {abierto && (
              <div className="mb-1 flex flex-col gap-0.5 pl-1">
                {grupo.items.map((item) => {
                  const activo = pathname.startsWith(item.href);
                  const ayuda = ayudaMenu[item.href];
                  return (
                    <div key={item.href}>
                      <Link
                        href={item.href}
                        title={ayuda?.resumen}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          activo
                            ? "bg-sena font-medium text-white shadow-sm"
                            : "text-zinc-700 hover:bg-sena-claro hover:text-azul dark:text-zinc-300 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span aria-hidden className="text-sm opacity-90">
                          {ayuda?.icono ?? "•"}
                        </span>
                        {item.label}
                      </Link>
                      {activo && ayuda && (
                        <p className="px-3 pb-1 pt-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                          {ayuda.resumen}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
