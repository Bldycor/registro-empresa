"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatBadge } from "@/components/stat-badge";
import type { EstadoSeguimiento } from "@/lib/seguimiento-evidencias";

type ChecklistItem = {
  clave: string;
  etiqueta: string;
  estado: EstadoSeguimiento;
  detalle: string;
  href: string | null;
};

type Aprendiz = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  ficha: string | null;
  fechaInicioEtapaProductiva: string | null;
  checklist: ChecklistItem[];
  atrasos: number;
  porCertificar: boolean;
};

const chipStyles: Record<EstadoSeguimiento, string> = {
  atrasada: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/60",
  proxima:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/60",
  completa:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900/60",
  pendiente:
    "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700",
};

const dotStyles: Record<EstadoSeguimiento, string> = {
  atrasada: "bg-red-600",
  proxima: "bg-amber-500",
  completa: "bg-emerald-600",
  pendiente: "bg-zinc-400 dark:bg-zinc-600",
};

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

function Chip({ item }: { item: ChecklistItem }) {
  const contenido = (
    <div
      className={`flex flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs transition-transform ${chipStyles[item.estado]} ${item.href ? "hover:-translate-y-0.5 hover:shadow-sm" : ""}`}
      title={item.detalle}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotStyles[item.estado]}`} aria-hidden />
        {item.etiqueta}
      </span>
      <span className="text-[11px] opacity-80">{item.detalle}</span>
    </div>
  );

  if (!item.href) return contenido;
  return (
    <Link href={item.href} className="block">
      {contenido}
    </Link>
  );
}

export function InstructorSeguimientoPanel() {
  const [aprendices, setAprendices] = useState<Aprendiz[] | null>(null);
  const [filtro, setFiltro] = useState<"ATRASADOS" | "POR_CERTIFICAR" | "AL_DIA" | "TODOS">(
    "ATRASADOS",
  );

  useEffect(() => {
    fetch("/api/instructor/seguimiento")
      .then((res) => res.json())
      .then((data) => setAprendices(data.aprendices ?? []));
  }, []);

  if (aprendices === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  // Categorías mutuamente excluyentes, en orden de prioridad: con atrasos primero (lo más
  // urgente), luego paz y salvo listo para certificar (lo más accionable), y por último al día
  // sin más que hacer todavía — así "al día" no se mezcla con "ya terminó todo".
  const conAtrasos = aprendices.filter((a) => a.atrasos > 0).length;
  const porCertificar = aprendices.filter((a) => a.atrasos === 0 && a.porCertificar).length;
  const alDia = aprendices.length - conAtrasos - porCertificar;

  const visibles = aprendices.filter((a) => {
    if (filtro === "ATRASADOS") return a.atrasos > 0;
    if (filtro === "POR_CERTIFICAR") return a.atrasos === 0 && a.porCertificar;
    if (filtro === "AL_DIA") return a.atrasos === 0 && !a.porCertificar;
    return true;
  });

  const mensajeVacio: Record<typeof filtro, string> = {
    ATRASADOS: "Nadie tiene atrasos ahora mismo.",
    POR_CERTIFICAR: "Nadie está listo para certificar todavía.",
    AL_DIA: "No hay aprendices en este filtro.",
    TODOS: "No hay aprendices en este filtro.",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="rojo" etiqueta="con atrasos" cantidad={conAtrasos} />
        <StatBadge tono="azul" etiqueta="por certificar" cantidad={porCertificar} />
        <StatBadge tono="verde" etiqueta="al día" cantidad={alDia} />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="ATRASADOS">Con atrasos</option>
          <option value="POR_CERTIFICAR">Por certificar</option>
          <option value="AL_DIA">Al día</option>
          <option value="TODOS">Todos</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {mensajeVacio[filtro]}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {a.nombres} {a.apellidos}{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      · CC {a.cedula} · Ficha {a.ficha ?? "sin asignar"}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {a.fechaInicioEtapaProductiva
                      ? `Etapa Productiva desde ${formatoFecha(a.fechaInicioEtapaProductiva)}`
                      : "Todavía no tiene fecha de inicio de Etapa Productiva"}
                  </p>
                </div>
                {a.atrasos > 0 ? (
                  <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                    {a.atrasos} atrasada{a.atrasos === 1 ? "" : "s"}
                  </span>
                ) : (
                  a.porCertificar && (
                    <span className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                      ✓ Por certificar
                    </span>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {a.checklist.map((item) => (
                  <Chip key={item.clave} item={item} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
