"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import {
  alternativaEtapaProductivaLabel,
  subtipoAlternativaEtapaProductivaLabel,
  tipoSolicitudAlternativaLabel,
  type AlternativaEtapaProductivaValue,
  type SubtipoAlternativaEtapaProductivaValue,
  type TipoSolicitudAlternativaValue,
} from "@/lib/validations";

type Seleccion = {
  id: string;
  tipoSolicitud: TipoSolicitudAlternativaValue;
  fechaSolicitud: string;
  alternativa: AlternativaEtapaProductivaValue;
  subtipoAlternativa: SubtipoAlternativaEtapaProductivaValue | null;
  fechaInicioEjecucion: string | null;
  fechaFinEjecucion: string | null;
  archivoUrl: string | null;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  observacionesAval: string | null;
  createdAt: string;
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    ficha: {
      codigo: string;
      programa: string | null;
      instructor: { nombres: string; apellidos: string } | null;
    } | null;
  };
};

export function AlternativasEPPanel({
  listUrl = "/api/coordinador/alternativas",
  patchUrlBase = "/api/coordinador/alternativas",
}: {
  listUrl?: string;
  patchUrlBase?: string;
} = {}) {
  const [selecciones, setSelecciones] = useState<Seleccion[] | null>(null);
  const [filtro, setFiltro] = useState<"TODAS" | "PENDIENTE" | "APROBADA" | "RECHAZADA">(
    "PENDIENTE",
  );
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch(listUrl)
      .then((res) => res.json())
      .then((data) => setSelecciones(data.selecciones ?? []));
  }

  useEffect(load, [listUrl]);

  async function avalar(id: string, estado: "APROBADA" | "RECHAZADA") {
    setBusy(id);
    await fetch(`${patchUrlBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, observacionesAval: observaciones[id] ?? null }),
    });
    setBusy(null);
    load();
  }

  if (selecciones === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const contadores = {
    PENDIENTE: selecciones.filter((s) => s.estado === "PENDIENTE").length,
    APROBADA: selecciones.filter((s) => s.estado === "APROBADA").length,
    RECHAZADA: selecciones.filter((s) => s.estado === "RECHAZADA").length,
  };

  const visibles = selecciones.filter((s) => filtro === "TODAS" || s.estado === filtro);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="ambar" etiqueta="pendientes" cantidad={contadores.PENDIENTE} />
        <StatBadge tono="verde" etiqueta="aprobadas" cantidad={contadores.APROBADA} />
        <StatBadge tono="rojo" etiqueta="rechazadas" cantidad={contadores.RECHAZADA} />

        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="PENDIENTE">Pendientes</option>
          <option value="APROBADA">Aprobadas</option>
          <option value="RECHAZADA">Rechazadas</option>
          <option value="TODAS">Todas</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay solicitudes en este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {s.user.nombres} {s.user.apellidos}{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      · CC {s.user.cedula} · Ficha {s.user.ficha?.codigo ?? "sin asignar"}
                      {s.user.ficha?.programa && <> · {s.user.ficha.programa}</>}
                      {" · Instructor "}
                      {s.user.ficha?.instructor
                        ? `${s.user.ficha.instructor.nombres} ${s.user.ficha.instructor.apellidos}`
                        : "sin asignar"}
                    </span>
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {tipoSolicitudAlternativaLabel[s.tipoSolicitud]} →{" "}
                    {alternativaEtapaProductivaLabel[s.alternativa]}
                    {s.subtipoAlternativa && (
                      <> ({subtipoAlternativaEtapaProductivaLabel[s.subtipoAlternativa]})</>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ejecución:{" "}
                    {s.fechaInicioEjecucion
                      ? new Date(s.fechaInicioEjecucion).toLocaleDateString("es-CO", {
                          timeZone: "UTC",
                        })
                      : "—"}{" "}
                    →{" "}
                    {s.fechaFinEjecucion
                      ? new Date(s.fechaFinEjecucion).toLocaleDateString("es-CO", {
                          timeZone: "UTC",
                        })
                      : "—"}
                  </p>
                  {s.archivoUrl && (
                    <a
                      href={s.archivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 underline dark:text-emerald-500"
                    >
                      Ver documento adjunto
                    </a>
                  )}
                </div>
                <EstadoBadge estado={s.estado} />
              </div>

              {s.estado === "PENDIENTE" && (
                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <textarea
                    placeholder="Observaciones (opcional)"
                    value={observaciones[s.id] ?? ""}
                    onChange={(e) =>
                      setObservaciones((prev) => ({ ...prev, [s.id]: e.target.value }))
                    }
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={() => avalar(s.id, "APROBADA")}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Avalar
                    </button>
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={() => avalar(s.id, "RECHAZADA")}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              )}

              {s.observacionesAval && s.estado !== "PENDIENTE" && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Observaciones: {s.observacionesAval}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
    APROBADA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
    RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  };
  const text: Record<string, string> = {
    PENDIENTE: "Pendiente",
    APROBADA: "Aprobada",
    RECHAZADA: "Rechazada",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[estado] ?? ""}`}>
      {text[estado] ?? estado}
    </span>
  );
}
