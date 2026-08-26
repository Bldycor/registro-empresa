"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import { nivelRiesgoARLLabel, type NivelRiesgoARLValue } from "@/lib/validations";

type Bitacora = {
  id: string;
  numero: number;
  periodoDesde: string | null;
  periodoHasta: string | null;
  fechaLimite: string;
  fechaEntrega: string | null;
  archivoUrl: string | null;
  arlAfiliado: boolean | null;
  arlNivelRiesgo: NivelRiesgoARLValue | null;
  arlRiesgoCorresponde: boolean | null;
  arlTieneEPP: boolean | null;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  observaciones: string | null;
  actividades: { descripcion: string; competencias: string | null; evidenciaCumplimiento: string | null }[];
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    ficha: { codigo: string } | null;
  };
};

function siNo(v: boolean | null): string {
  return v === true ? "Sí" : v === false ? "No" : "Sin definir";
}

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

export function BitacorasPanel() {
  const [items, setItems] = useState<Bitacora[] | null>(null);
  const [filtro, setFiltro] = useState<"TODAS" | "PENDIENTE" | "APROBADA" | "RECHAZADA">(
    "PENDIENTE"
  );
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/instructor/bitacoras")
      .then((res) => res.json())
      .then((data) => setItems(data.bitacoras ?? []));
  }

  useEffect(load, []);

  async function avalar(id: string, estado: "APROBADA" | "RECHAZADA") {
    setBusy(id);
    await fetch(`/api/instructor/bitacoras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, observaciones: observaciones[id] ?? null }),
    });
    setBusy(null);
    load();
  }

  if (items === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const contadores = {
    PENDIENTE: items.filter((s) => s.estado === "PENDIENTE").length,
    APROBADA: items.filter((s) => s.estado === "APROBADA").length,
    RECHAZADA: items.filter((s) => s.estado === "RECHAZADA").length,
  };

  const visibles = items.filter((s) => filtro === "TODAS" || s.estado === filtro);

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
          No hay bitácoras en este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((b) => {
            const expandido = expandidoId === b.id;
            return (
              <li
                key={b.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {b.user.nombres} {b.user.apellidos}{" "}
                      <span className="font-normal text-zinc-500 dark:text-zinc-400">
                        · CC {b.user.cedula} · Ficha {b.user.ficha?.codigo ?? "sin asignar"}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      Bitácora {b.numero}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Fecha límite: {formatoFecha(b.fechaLimite)}
                      {b.fechaEntrega && ` · Enviada: ${formatoFecha(b.fechaEntrega)}`}
                    </p>
                    {b.archivoUrl && (
                      <a
                        href={b.archivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-700 underline dark:text-emerald-500"
                      >
                        Ver bitácora adjunta
                      </a>
                    )}
                  </div>
                  <EstadoBadge estado={b.estado} />
                </div>

                <button
                  type="button"
                  onClick={() => setExpandidoId(expandido ? null : b.id)}
                  className="mt-2 text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {expandido ? "Ocultar detalle" : `Ver detalle (${b.actividades.length} actividad(es), ARL)`}
                </button>

                {expandido && (
                  <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <p>Afiliado ARL: {siNo(b.arlAfiliado)}</p>
                      <p>
                        Nivel de riesgo:{" "}
                        {b.arlNivelRiesgo ? nivelRiesgoARLLabel[b.arlNivelRiesgo] : "Sin definir"}
                      </p>
                      <p>Riesgo corresponde: {siNo(b.arlRiesgoCorresponde)}</p>
                      <p>Tiene EPP: {siNo(b.arlTieneEPP)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">Actividades:</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {b.actividades.map((a, i) => (
                          <li key={i}>
                            {a.descripcion}
                            {a.competencias && ` — ${a.competencias}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {b.estado === "PENDIENTE" && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <textarea
                      placeholder="Observaciones (opcional)"
                      value={observaciones[b.id] ?? ""}
                      onChange={(e) =>
                        setObservaciones((prev) => ({ ...prev, [b.id]: e.target.value }))
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => avalar(b.id, "APROBADA")}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Avalar
                      </button>
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => avalar(b.id, "RECHAZADA")}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}

                {b.observaciones && b.estado !== "PENDIENTE" && (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Observaciones: {b.observaciones}
                  </p>
                )}
              </li>
            );
          })}
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
