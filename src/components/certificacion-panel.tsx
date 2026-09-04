"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";

type Certificacion = {
  id: string;
  fecha: string | null;
  archivoUrl: string | null;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  observaciones: string | null;
  createdAt: string;
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    fechaFinEtapaProductiva: string | null;
    ficha: { codigo: string } | null;
  };
};

export function CertificacionPanel() {
  const [items, setItems] = useState<Certificacion[] | null>(null);
  const [filtro, setFiltro] = useState<"TODAS" | "PENDIENTE" | "APROBADA" | "RECHAZADA">(
    "PENDIENTE",
  );
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/instructor/certificacion")
      .then((res) => res.json())
      .then((data) => setItems(data.certificaciones ?? []));
  }

  useEffect(load, []);

  async function avalar(id: string, estado: "APROBADA" | "RECHAZADA") {
    setBusy(id);
    await fetch(`/api/instructor/certificacion/${id}`, {
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
          No hay cartas de certificación en este filtro.
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
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Fecha de la carta:{" "}
                    {s.fecha
                      ? new Date(s.fecha).toLocaleDateString("es-CO", { timeZone: "UTC" })
                      : "—"}
                    {s.user.fechaFinEtapaProductiva &&
                      ` · Fin de EP: ${new Date(s.user.fechaFinEtapaProductiva).toLocaleDateString("es-CO", { timeZone: "UTC" })}`}
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

              {s.observaciones && s.estado !== "PENDIENTE" && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Observaciones: {s.observaciones}
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
