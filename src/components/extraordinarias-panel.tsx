"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import { PlazoBadge } from "@/components/plazo-badge";
import {
  modalidadEjecucionEPLabel,
  type ModalidadEjecucionEPValue,
  type SolicitanteReunionValue,
} from "@/lib/validations";

type Reunion = {
  id: string;
  fecha: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  modalidad: ModalidadEjecucionEPValue | null;
  motivoExtraordinario: string | null;
  solicitadaPor: SolicitanteReunionValue | null;
  estado: string;
  observaciones: string | null;
  videollamadaUrl: string | null;
  fechaAval: string | null;
  createdAt: string;
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    ficha: { codigo: string; programa: string | null } | null;
  };
};

// La fecha es un día de calendario guardado a medianoche UTC: se muestra en UTC.
function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ExtraordinariasPanel() {
  const [reuniones, setReuniones] = useState<Reunion[] | null>(null);
  const [filtro, setFiltro] = useState<"PENDIENTE" | "APROBADA" | "RECHAZADA" | "TODAS">("PENDIENTE");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroPrograma, setFiltroPrograma] = useState("");
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/instructor/extraordinarias")
      .then((res) => res.json())
      .then((data) => setReuniones(data.reuniones ?? []));
  }

  useEffect(load, []);

  async function responder(id: string, estado: "APROBADA" | "RECHAZADA") {
    setBusy(id);
    setErrores((prev) => ({ ...prev, [id]: "" }));
    const res = await fetch(`/api/instructor/extraordinarias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, observaciones: observaciones[id] ?? null }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg =
        typeof data.error === "string"
          ? data.error
          : Object.values(data.error ?? {})
              .flat()
              .join(" ") || "No se pudo guardar.";
      setErrores((prev) => ({ ...prev, [id]: msg }));
      return;
    }
    load();
  }

  if (reuniones === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const contadores = {
    PENDIENTE: reuniones.filter((r) => r.estado === "PENDIENTE").length,
    APROBADA: reuniones.filter((r) => r.estado === "APROBADA").length,
    RECHAZADA: reuniones.filter((r) => r.estado === "RECHAZADA").length,
  };

  const programasDisponibles = Array.from(
    new Set(reuniones.map((r) => r.user.ficha?.programa).filter((p): p is string => Boolean(p))),
  ).sort((a, b) => a.localeCompare(b));

  const visibles = reuniones.filter((r) => {
    if (filtro !== "TODAS" && r.estado !== filtro) return false;
    if (filtroPrograma && r.user.ficha?.programa !== filtroPrograma) return false;
    const texto = filtroTexto.trim().toLowerCase();
    if (texto) {
      const nombre = `${r.user.nombres} ${r.user.apellidos}`.toLowerCase();
      if (!nombre.includes(texto) && !r.user.cedula.includes(texto)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="ambar" etiqueta="por aprobar" cantidad={contadores.PENDIENTE} />
        <StatBadge tono="verde" etiqueta="aprobadas" cantidad={contadores.APROBADA} />
        <StatBadge tono="rojo" etiqueta="no aprobadas" cantidad={contadores.RECHAZADA} />

        <input
          type="text"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          placeholder="Buscar por aprendiz o cédula"
          className="ml-auto w-48 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <select
          value={filtroPrograma}
          onChange={(e) => setFiltroPrograma(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">Todos los programas</option>
          {programasDisponibles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="PENDIENTE">Por aprobar</option>
          <option value="APROBADA">Aprobadas</option>
          <option value="RECHAZADA">No aprobadas</option>
          <option value="TODAS">Todas</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay reuniones extraordinarias en este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {r.user.nombres} {r.user.apellidos}{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      · CC {r.user.cedula} · Ficha {r.user.ficha?.codigo ?? "sin asignar"}
                      {r.user.ficha?.programa && <> · {r.user.ficha.programa}</>}
                    </span>
                  </p>
                  <p className="text-sm capitalize text-zinc-700 dark:text-zinc-300">
                    {r.fecha ? fechaLegible(r.fecha) : "—"} · {r.horaInicio}–{r.horaFin}
                    {r.modalidad && (
                      <span className="normal-case"> · {modalidadEjecucionEPLabel[r.modalidad]}</span>
                    )}
                  </p>
                  {r.motivoExtraordinario && (
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      <strong>Motivo:</strong> {r.motivoExtraordinario}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Pedida por {r.solicitadaPor === "COFORMADOR" ? "el coformador" : "el aprendiz"}
                  </p>
                  {r.estado === "APROBADA" && r.videollamadaUrl && (
                    <a
                      href={r.videollamadaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 underline dark:text-emerald-500"
                    >
                      Enlace de la videollamada
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {r.estado === "PENDIENTE" && <PlazoBadge desde={r.createdAt} />}
                  <EstadoBadge estado={r.estado} />
                </div>
              </div>

              {r.estado === "PENDIENTE" && (
                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <textarea
                    placeholder="Nota para el aprendiz (obligatoria si no la apruebas)"
                    value={observaciones[r.id] ?? ""}
                    onChange={(e) => setObservaciones((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    rows={2}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Al aprobarla se envía la citación con el enlace al aprendiz y a su coformador.
                  </p>
                  {errores[r.id] && <p className="text-xs text-red-600">{errores[r.id]}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => responder(r.id, "APROBADA")}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Aprobar y enviar citación
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => responder(r.id, "RECHAZADA")}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      No aprobar
                    </button>
                  </div>
                </div>
              )}

              {r.observaciones && r.estado !== "PENDIENTE" && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">Nota: {r.observaciones}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const [clase, texto] =
    estado === "PENDIENTE"
      ? ["bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400", "Por aprobar"]
      : estado === "APROBADA"
        ? ["bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400", "Aprobada"]
        : ["bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400", "No aprobada"];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>{texto}</span>
  );
}
