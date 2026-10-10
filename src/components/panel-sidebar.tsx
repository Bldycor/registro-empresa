"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ayudaMenu } from "@/lib/ayuda";
import type { PendientesMenu } from "@/lib/pendientes-menu";

const roleLabel: Record<string, string> = {
  INSTRUCTOR: "Instructor",
  COORDINADOR: "Coordinador de Etapa Productiva",
  ADMIN: "Administrador",
};

type Grupo = { titulo: string; icono: string; items: { href: string; label: string }[] };

// Lo que comparten Coordinación y el administrador (el administrador suma Coordinadores y Empresas).
const gruposCoordinacion = (estructuraExtra: Grupo["items"] = []): Grupo[] => [
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
      { href: "/formulario/coordinador/planes", label: "Planes de mejoramiento" },
    ],
  },
  {
    titulo: "Consultas",
    icono: "📊",
    items: [
      { href: "/formulario/reportes", label: "Reportes" },
      { href: "/formulario/reportes/instructores", label: "Gestión de instructores" },
      { href: "/formulario/reportes/funciones", label: "Funciones en la empresa" },
      { href: "/formulario/coordinador/auditoria", label: "Trazabilidad" },
    ],
  },
  {
    titulo: "Estructura",
    icono: "🗃️",
    items: [
      ...estructuraExtra,
      { href: "/formulario/admin/empresas", label: "Empresas" },
      { href: "/formulario/coordinador/fichas", label: "Fichas" },
      { href: "/formulario/coordinador/instructores", label: "Instructores" },
      { href: "/formulario/coordinador/competencias", label: "Competencias" },
      { href: "/formulario/coordinador/configuracion", label: "Datos del centro" },
    ],
  },
  {
    titulo: "Ayuda y cuenta",
    icono: "❓",
    items: [
      { href: "/formulario/ayuda", label: "Guía de uso" },
      { href: "/formulario/coordinador/perfil", label: "Mi perfil" },
    ],
  },
];

// El menú va agrupado por tarea, no por entidad: cada bloque responde a "qué vengo a hacer", y lo
// del día a día va primero. Los grupos se pliegan para que la lista quepa de un vistazo: se abre
// el de la página actual y los que tienen algo pendiente; el usuario puede abrir o cerrar los demás.
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
        { href: "/formulario/instructor/planes", label: "Planes de mejoramiento" },
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
  COORDINADOR: gruposCoordinacion(),
  ADMIN: gruposCoordinacion([
    { href: "/formulario/admin/coordinadores", label: "Coordinadores" },
    { href: "/formulario/admin/claves", label: "Contraseñas" },
  ]),
};

function Contador({ n, suave = false }: { n: number; suave?: boolean }) {
  if (!n) return null;
  return (
    <span
      aria-label={`${n} pendiente${n === 1 ? "" : "s"}`}
      className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums leading-none ${
        suave
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100"
          : "bg-amber-500 text-white"
      }`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

// Sidebar izquierdo para Instructor/Coordinador/Admin. El Aprendiz usa el nav horizontal superior
// (`EvidenciaEPNav`, ver formulario/layout.tsx). En el celular se pliega tras un botón «Menú».
export function PanelSidebar({ role, pendientes = {} }: { role: string; pendientes?: PendientesMenu }) {
  const pathname = usePathname() ?? "";
  const grupos = roleNav[role] ?? [];
  // La opción activa es la de ruta más larga que coincide («Reportes» no se marca dentro de
  // «Funciones en la empresa», que vive en /formulario/reportes/funciones).
  const itemActivo = grupos
    .flatMap((g) => g.items)
    .filter((i) => pathname.startsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const grupoActivo = grupos.find((g) => g.items.some((i) => i.href === itemActivo?.href))?.titulo;
  const totalGrupo = (g: Grupo) => g.items.reduce((s, i) => s + (pendientes[i.href] ?? 0), 0);
  const totalPendiente = grupos.reduce((s, g) => s + totalGrupo(g), 0);

  // Por defecto se abren el grupo de la página actual y los que tienen pendientes; lo que el
  // usuario abra o cierre a mano se guarda aquí y manda sobre ese valor, mientras dure la visita.
  const [alternados, setAlternados] = useState<Record<string, boolean>>({});
  const porDefecto = (g: Grupo) => g.titulo === grupoActivo || totalGrupo(g) > 0;
  const estaAbierto = (g: Grupo) => alternados[g.titulo] ?? porDefecto(g);
  function alternar(g: Grupo) {
    setAlternados((prev) => ({ ...prev, [g.titulo]: !(prev[g.titulo] ?? porDefecto(g)) }));
  }

  // Celular: el menú se cierra al elegir una opción. Se guarda la ruta en la que se abrió, así que
  // al navegar queda cerrado solo, sin efectos.
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const movilAbierto = abiertoEn === pathname;

  return (
    <nav
      aria-label="Menú principal"
      className="flex w-full shrink-0 flex-col border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:sticky sm:top-0 sm:h-screen sm:w-72 sm:overflow-y-auto sm:border-b-0 sm:border-r print:hidden"
    >
      <button
        type="button"
        onClick={() => setAbiertoEn(movilAbierto ? null : pathname)}
        aria-expanded={movilAbierto}
        className="flex items-center gap-3 px-4 py-3 text-left sm:hidden"
      >
        <span aria-hidden className="text-lg leading-none text-zinc-500">
          {movilAbierto ? "✕" : "☰"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] uppercase tracking-wide text-zinc-400">Menú</span>
          <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {itemActivo?.label ?? roleLabel[role] ?? role}
          </span>
        </span>
        <Contador n={totalPendiente} />
      </button>

      <div className={`${movilAbierto ? "flex" : "hidden"} flex-col gap-1 p-3 pt-0 sm:flex sm:pt-3`}>
        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {roleLabel[role] ?? role}
        </p>

        {grupos.map((grupo) => {
          const abierto = estaAbierto(grupo);
          const tieneActivo = grupo.titulo === grupoActivo;
          return (
            <div key={grupo.titulo} className="flex flex-col">
              <button
                type="button"
                onClick={() => alternar(grupo)}
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
                {!abierto && <Contador n={totalGrupo(grupo)} suave />}
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
                    const activo = item.href === itemActivo?.href;
                    const ayuda = ayudaMenu[item.href];
                    return (
                      <div key={item.href}>
                        <Link
                          href={item.href}
                          title={ayuda?.resumen}
                          aria-current={activo ? "page" : undefined}
                          onClick={() => setAbiertoEn(null)}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sena ${
                            activo
                              ? "bg-sena font-medium text-white shadow-sm"
                              : "text-zinc-700 hover:bg-sena-claro hover:text-azul dark:text-zinc-300 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span aria-hidden className="text-sm opacity-90">
                            {ayuda?.icono ?? "•"}
                          </span>
                          <span className="flex-1">{item.label}</span>
                          <Contador n={pendientes[item.href] ?? 0} />
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
      </div>
    </nav>
  );
}
