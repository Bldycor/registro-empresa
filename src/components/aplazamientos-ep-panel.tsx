"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import { PlazoBadge } from "@/components/plazo-badge";
import {
  alternativaEtapaProductivaLabel,
  motivoAplazamientoEPLabel,
  type AlternativaEtapaProductivaValue,
  type MotivoAplazamientoEPValue,
} from "@/lib/validations";

type Aplazamiento = {
  id: string;
  alternativa: AlternativaEtapaProductivaValue;
  fechaInicioTramo: string;
  fechaSuspension: string;
  fechaReanudacionPrevista: string;
  fechaReanudacionReal: string | null;
  diasEjecutados: number;
  motivo: MotivoAplazamientoEPValue;
  motivoDetalle: string | null;
  soporteUrl: string | null;
  estado: string;
  fechaAval: string | null;
  observacionesAval: string | null;
  actaComite: string | null;
  fechaActaComite: string | null;
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

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AplazamientosEPPanel() {
  const [aplazamientos, setAplazamientos] = useState<Aplazamiento[] | null>(null);
  const [filtro, setFiltro] = useState<"TODOS" | "PENDIENTE" | "EN_CURSO" | "RESUELTOS">(
    "PENDIENTE",
  );
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroPrograma, setFiltroPrograma] = useState("");
  const [dias, setDias] = useState<Record<string, string>>({});
  const [acta, setActa] = useState<Record<string, string>>({});
  const [fechaActa, setFechaActa] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [reanudacion, setReanudacion] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch("/api/coordinador/aplazamientos")
      .then((res) => res.json())
      .then((data) => setAplazamientos(data.aplazamientos ?? []));
  }

  useEffect(load, []);

  async function enviar(id: string, payload: Record<string, unknown>) {
    setBusy(id);
    setErrores((prev) => ({ ...prev, [id]: "" }));
    const res = await fetch(`/api/coordinador/aplazamientos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
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

  if (aplazamientos === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const enCurso = (a: Aplazamiento) => a.estado === "APROBADA" && !a.fechaReanudacionReal;

  const contadores = {
    PENDIENTE: aplazamientos.filter((a) => a.estado === "PENDIENTE").length,
    EN_CURSO: aplazamientos.filter(enCurso).length,
    RESUELTOS: aplazamientos.filter((a) => a.estado === "RECHAZADA" || a.fechaReanudacionReal)
      .length,
  };

  const programasDisponibles = Array.from(
    new Set(aplazamientos.map((a) => a.user.ficha?.programa).filter((p): p is string => Boolean(p))),
  ).sort((a, b) => a.localeCompare(b));

  const visibles = aplazamientos.filter((a) => {
    if (filtro === "PENDIENTE" && a.estado !== "PENDIENTE") return false;
    if (filtro === "EN_CURSO" && !enCurso(a)) return false;
    if (filtro === "RESUELTOS" && !(a.estado === "RECHAZADA" || a.fechaReanudacionReal)) {
      return false;
    }
    if (filtroPrograma && a.user.ficha?.programa !== filtroPrograma) return false;
    const texto = filtroTexto.trim().toLowerCase();
    if (texto) {
      const nombreCompleto = `${a.user.nombres} ${a.user.apellidos}`.toLowerCase();
      if (!nombreCompleto.includes(texto) && !a.user.cedula.includes(texto)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="ambar" etiqueta="por autorizar" cantidad={contadores.PENDIENTE} />
        <StatBadge tono="azul" etiqueta="en curso" cantidad={contadores.EN_CURSO} />
        <StatBadge tono="verde" etiqueta="resueltos" cantidad={contadores.RESUELTOS} />

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
          <option value="PENDIENTE">Por autorizar</option>
          <option value="EN_CURSO">En curso</option>
          <option value="RESUELTOS">Resueltos</option>
          <option value="TODOS">Todos</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay aplazamientos en este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((a) => {
            const diasPropuestos = Number(dias[a.id] ?? a.diasEjecutados);
            const totalPrevio =
              a.user.diasEjecutadosPrevios + (Number.isFinite(diasPropuestos) ? diasPropuestos : 0);
            const restante = Math.max(1, DURACION_EP_DIAS - totalPrevio);

            return (
              <li
                key={a.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {a.user.nombres} {a.user.apellidos}{" "}
                      <span className="font-normal text-zinc-500 dark:text-zinc-400">
                        · CC {a.user.cedula} · Ficha {a.user.ficha?.codigo ?? "sin asignar"}
                        {a.user.ficha?.programa && <> · {a.user.ficha.programa}</>}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {motivoAplazamientoEPLabel[a.motivo]} ·{" "}
                      {alternativaEtapaProductivaLabel[a.alternativa]}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Tramo: {fecha(a.fechaInicioTramo)} → {fecha(a.fechaSuspension)} ·{" "}
                      {a.diasEjecutados} día(s) cumplidos · regreso previsto{" "}
                      {fecha(a.fechaReanudacionPrevista)}
                    </p>
                    {a.motivoDetalle && (
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Detalle: {a.motivoDetalle}
                      </p>
                    )}
                    {a.soporteUrl ? (
                      <a
                        href={a.soporteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-700 underline dark:text-emerald-500"
                      >
                        Ver soporte de la novedad
                      </a>
                    ) : (
                      <p className="text-xs text-amber-700 dark:text-amber-500">
                        Sin soporte adjunto — pídelo antes de llevarlo al Comité.
                      </p>
                    )}
                    {a.actaComite && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Acta {a.actaComite}
                        {a.fechaActaComite && <> del {fecha(a.fechaActaComite)}</>}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {a.estado === "PENDIENTE" && <PlazoBadge desde={a.createdAt} />}
                    <EstadoBadge aplazamiento={a} />
                  </div>
                </div>

                {a.estado === "PENDIENTE" && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      Días que se le contabilizan:
                      <input
                        type="number"
                        min={0}
                        max={DURACION_EP_DIAS}
                        value={dias[a.id] ?? String(a.diasEjecutados)}
                        onChange={(e) => setDias((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Al reanudar le quedarían {restante} día(s).
                      </span>
                    </label>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={acta[a.id] ?? ""}
                        onChange={(e) => setActa((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        placeholder="Acta del Comité (n.º)"
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <input
                        type="date"
                        value={fechaActa[a.id] ?? ""}
                        onChange={(e) =>
                          setFechaActa((prev) => ({ ...prev, [a.id]: e.target.value }))
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                    </div>

                    <textarea
                      placeholder="Observaciones del Comité (opcional)"
                      value={observaciones[a.id] ?? ""}
                      onChange={(e) =>
                        setObservaciones((prev) => ({ ...prev, [a.id]: e.target.value }))
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      rows={2}
                    />

                    {errores[a.id] && <p className="text-xs text-red-600">{errores[a.id]}</p>}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === a.id}
                        onClick={() =>
                          enviar(a.id, {
                            estado: "APROBADA",
                            diasEjecutados: dias[a.id] ? Number(dias[a.id]) : undefined,
                            observacionesAval: observaciones[a.id] ?? null,
                            actaComite: acta[a.id] ?? null,
                            fechaActaComite: fechaActa[a.id] || null,
                          })
                        }
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Autorizar aplazamiento
                      </button>
                      <button
                        type="button"
                        disabled={busy === a.id}
                        onClick={() =>
                          enviar(a.id, {
                            estado: "RECHAZADA",
                            observacionesAval: observaciones[a.id] ?? null,
                          })
                        }
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Negar
                      </button>
                    </div>
                  </div>
                )}

                {enCurso(a) && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Cuando el aprendiz vuelva, registra la fecha real: desde ahí se recalculan sus
                      fechas con el tiempo que le falta y sus bitácoras siguen numerando donde iban.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={reanudacion[a.id] ?? hoyISO()}
                        onChange={(e) =>
                          setReanudacion((prev) => ({ ...prev, [a.id]: e.target.value }))
                        }
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <button
                        type="button"
                        disabled={busy === a.id}
                        onClick={() =>
                          enviar(a.id, {
                            fechaReanudacionReal: reanudacion[a.id] ?? hoyISO(),
                          })
                        }
                        className="rounded-md bg-sena px-3 py-1.5 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
                      >
                        Registrar reanudación
                      </button>
                    </div>
                    {errores[a.id] && <p className="text-xs text-red-600">{errores[a.id]}</p>}
                  </div>
                )}

                {a.observacionesAval && a.estado !== "PENDIENTE" && (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Observaciones: {a.observacionesAval}
                  </p>
                )}
                {a.fechaReanudacionReal && (
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-500">
                    Reanudó el {fecha(a.fechaReanudacionReal)}.
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

function EstadoBadge({ aplazamiento }: { aplazamiento: Aplazamiento }) {
  const { estado, fechaReanudacionReal } = aplazamiento;
  const [clase, texto] =
    estado === "PENDIENTE"
      ? ["bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400", "Por autorizar"]
      : estado === "RECHAZADA"
        ? ["bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400", "Negado"]
        : fechaReanudacionReal
          ? ["bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", "Reanudado"]
          : ["bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400", "En curso"];

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${clase}`}>
      {texto}
    </span>
  );
}
