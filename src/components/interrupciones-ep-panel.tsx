"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import { PlazoBadge } from "@/components/plazo-badge";
import { PLAZO_CAMBIO_ALTERNATIVA_HABILES } from "@/lib/plazos-institucionales";
import {
  alternativaEtapaProductivaLabel,
  motivoInterrupcionEPLabel,
  type AlternativaEtapaProductivaValue,
  type MotivoInterrupcionEPValue,
} from "@/lib/validations";

type Interrupcion = {
  id: string;
  alternativa: AlternativaEtapaProductivaValue;
  fechaInicioTramo: string;
  fechaInterrupcion: string;
  diasEjecutados: number;
  motivo: MotivoInterrupcionEPValue;
  motivoDetalle: string | null;
  certificadoUrl: string | null;
  estado: string;
  fechaAval: string | null;
  observacionesAval: string | null;
  createdAt: string;
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    estado: string;
    diasEjecutadosPrevios: number;
    ficha: { codigo: string; programa: string | null } | null;
  };
};

const DURACION_EP_DIAS = 180;

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

export function InterrupcionesEPPanel() {
  const [interrupciones, setInterrupciones] = useState<Interrupcion[] | null>(null);
  const [filtro, setFiltro] = useState<"TODAS" | "PENDIENTE" | "APROBADA" | "RECHAZADA">(
    "PENDIENTE",
  );
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroPrograma, setFiltroPrograma] = useState("");
  const [dias, setDias] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/coordinador/interrupciones")
      .then((res) => res.json())
      .then((data) => setInterrupciones(data.interrupciones ?? []));
  }

  useEffect(load, []);

  async function avalar(i: Interrupcion, estado: "APROBADA" | "RECHAZADA") {
    setBusy(i.id);
    const editado = dias[i.id];
    await fetch(`/api/coordinador/interrupciones/${i.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estado,
        diasEjecutados: editado ? Number(editado) : undefined,
        observacionesAval: observaciones[i.id] ?? null,
      }),
    });
    setBusy(null);
    load();
  }

  if (interrupciones === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const contadores = {
    PENDIENTE: interrupciones.filter((i) => i.estado === "PENDIENTE").length,
    APROBADA: interrupciones.filter((i) => i.estado === "APROBADA").length,
    RECHAZADA: interrupciones.filter((i) => i.estado === "RECHAZADA").length,
  };

  const programasDisponibles = Array.from(
    new Set(interrupciones.map((i) => i.user.ficha?.programa).filter((p): p is string => Boolean(p))),
  ).sort((a, b) => a.localeCompare(b));

  const visibles = interrupciones.filter((i) => {
    if (filtro !== "TODAS" && i.estado !== filtro) return false;
    if (filtroPrograma && i.user.ficha?.programa !== filtroPrograma) return false;
    const texto = filtroTexto.trim().toLowerCase();
    if (texto) {
      const nombreCompleto = `${i.user.nombres} ${i.user.apellidos}`.toLowerCase();
      if (!nombreCompleto.includes(texto) && !i.user.cedula.includes(texto)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="ambar" etiqueta="pendientes" cantidad={contadores.PENDIENTE} />
        <StatBadge tono="verde" etiqueta="avaladas" cantidad={contadores.APROBADA} />
        <StatBadge tono="rojo" etiqueta="rechazadas" cantidad={contadores.RECHAZADA} />

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
          <option value="PENDIENTE">Pendientes</option>
          <option value="APROBADA">Avaladas</option>
          <option value="RECHAZADA">Rechazadas</option>
          <option value="TODAS">Todas</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay interrupciones en este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((i) => {
            const diasPropuestos = Number(dias[i.id] ?? i.diasEjecutados);
            const totalPrevio = i.user.diasEjecutadosPrevios + (Number.isFinite(diasPropuestos) ? diasPropuestos : 0);
            const restante = Math.max(1, DURACION_EP_DIAS - totalPrevio);

            return (
              <li
                key={i.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {i.user.nombres} {i.user.apellidos}{" "}
                      <span className="font-normal text-zinc-500 dark:text-zinc-400">
                        · CC {i.user.cedula} · Ficha {i.user.ficha?.codigo ?? "sin asignar"}
                        {i.user.ficha?.programa && <> · {i.user.ficha.programa}</>}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {motivoInterrupcionEPLabel[i.motivo]} ·{" "}
                      {alternativaEtapaProductivaLabel[i.alternativa]}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Tramo ejecutado: {fecha(i.fechaInicioTramo)} → {fecha(i.fechaInterrupcion)} ·{" "}
                      {i.diasEjecutados} día(s) reportados
                      {i.user.diasEjecutadosPrevios > 0 && (
                        <> · ya tenía {i.user.diasEjecutadosPrevios} día(s) de tramos anteriores</>
                      )}
                    </p>
                    {i.motivoDetalle && (
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Detalle: {i.motivoDetalle}
                      </p>
                    )}
                    {i.certificadoUrl ? (
                      <a
                        href={i.certificadoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-700 underline dark:text-emerald-500"
                      >
                        Ver certificado de práctica
                      </a>
                    ) : (
                      <p className="text-xs text-amber-700 dark:text-amber-500">
                        Sin certificado de práctica adjunto — exígelo antes de contabilizar el
                        tiempo (GFPI-G-040 §9.3.1).
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {/* Interrumpir es el paso previo a cambiar de alternativa: le corre el mismo
                        plazo de respuesta de 15 días hábiles (§9.3.1). */}
                    {i.estado === "PENDIENTE" && (
                      <PlazoBadge desde={i.createdAt} limite={PLAZO_CAMBIO_ALTERNATIVA_HABILES} />
                    )}
                    <EstadoBadge estado={i.estado} />
                  </div>
                </div>

                {i.estado === "PENDIENTE" && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      Días que se le contabilizan:
                      <input
                        type="number"
                        min={0}
                        max={DURACION_EP_DIAS}
                        value={dias[i.id] ?? String(i.diasEjecutados)}
                        onChange={(e) => setDias((prev) => ({ ...prev, [i.id]: e.target.value }))}
                        className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Le quedarían {restante} día(s) para completar la Etapa Productiva.
                      </span>
                    </label>
                    <textarea
                      placeholder="Observaciones (opcional)"
                      value={observaciones[i.id] ?? ""}
                      onChange={(e) =>
                        setObservaciones((prev) => ({ ...prev, [i.id]: e.target.value }))
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === i.id}
                        onClick={() => avalar(i, "APROBADA")}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Avalar interrupción
                      </button>
                      <button
                        type="button"
                        disabled={busy === i.id}
                        onClick={() => avalar(i, "RECHAZADA")}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}

                {i.observacionesAval && i.estado !== "PENDIENTE" && (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Observaciones: {i.observacionesAval}
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
    APROBADA: "Avalada",
    RECHAZADA: "Rechazada",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[estado] ?? ""}`}>
      {text[estado] ?? estado}
    </span>
  );
}
