"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import {
  ValoracionVariableValues,
  valoracionVariableLabel,
  JuicioEtapaProductivaValues,
  juicioEtapaProductivaLabel,
  modalidadEjecucionEPLabel,
} from "@/lib/validations";
import { VARIABLES_TECNICAS, VARIABLES_ACTITUDINALES, variableLabel } from "@/lib/evaluacion-variables";

type Variable = {
  variable: string;
  categoria: "TECNICO" | "ACTITUDINAL";
  valoracion: "SATISFACTORIO" | "POR_MEJORAR" | null;
  observaciones: string | null;
};

type Evaluacion = {
  id: string;
  numero: number;
  fecha: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  modalidad: "PRESENCIAL" | "VIRTUAL" | null;
  videollamadaUrl: string | null;
  juicioFinal: "APROBADO" | "NO_APROBADO" | null;
  retroalimentacionCoformador: string | null;
  retroalimentacionInstructor: string | null;
  retroalimentacionAprendiz: string | null;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  variables: Variable[];
  user: { id: string; nombres: string; apellidos: string; cedula: string; ficha: { codigo: string } | null };
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

export function InstructorEvaluacionesPanel() {
  const [items, setItems] = useState<Evaluacion[] | null>(null);
  const [filtro, setFiltro] = useState<"PENDIENTES" | "EVALUADAS" | "TODAS">("PENDIENTES");
  const [expandidoId, setExpandidoId] = useState<string | null>(null);

  function load() {
    fetch("/api/instructor/evaluaciones")
      .then((res) => res.json())
      .then((data) => setItems(data.evaluaciones ?? []));
  }

  useEffect(load, []);

  if (items === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const pendientes = items.filter((e) => e.estado !== "APROBADA").length;
  const evaluadas = items.filter((e) => e.estado === "APROBADA").length;

  const visibles = items.filter((e) => {
    if (filtro === "PENDIENTES") return e.estado !== "APROBADA";
    if (filtro === "EVALUADAS") return e.estado === "APROBADA";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="ambar" etiqueta="pendientes" cantidad={pendientes} />
        <StatBadge tono="verde" etiqueta="evaluadas" cantidad={evaluadas} />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className={`${inputClass} ml-auto`}
        >
          <option value="PENDIENTES">Pendientes</option>
          <option value="EVALUADAS">Evaluadas</option>
          <option value="TODAS">Todas</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay reuniones en este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((ev) => (
            <li
              key={ev.id}
              className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <button
                type="button"
                onClick={() => setExpandidoId(expandidoId === ev.id ? null : ev.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {ev.user.nombres} {ev.user.apellidos}{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      · CC {ev.user.cedula} · Ficha {ev.user.ficha?.codigo ?? "sin asignar"}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Momento {ev.numero} · {ev.fecha ? formatoFecha(ev.fecha) : "sin fecha"}
                    {ev.horaInicio && ` · ${ev.horaInicio}-${ev.horaFin}`}
                    {ev.modalidad && ` · ${modalidadEjecucionEPLabel[ev.modalidad]}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    ev.estado === "APROBADA"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400"
                  }`}
                >
                  {ev.estado === "APROBADA" ? "Evaluada" : "Pendiente"}
                </span>
              </button>

              {expandidoId === ev.id && (
                <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                  <RubricaForm evaluacion={ev} onSaved={load} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RubricaForm({ evaluacion, onSaved }: { evaluacion: Evaluacion; onSaved: () => void }) {
  const [valores, setValores] = useState<Record<string, { valoracion: string; observaciones: string }>>(
    () =>
      Object.fromEntries(
        evaluacion.variables.map((v) => [
          v.variable,
          { valoracion: v.valoracion ?? "", observaciones: v.observaciones ?? "" },
        ])
      )
  );
  const [retroInstructor, setRetroInstructor] = useState(evaluacion.retroalimentacionInstructor ?? "");
  const [retroCoformador, setRetroCoformador] = useState(evaluacion.retroalimentacionCoformador ?? "");
  const [juicioFinal, setJuicioFinal] = useState(evaluacion.juicioFinal ?? "");
  const [loading, setLoading] = useState<"borrador" | "finalizar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bloqueado = evaluacion.estado === "APROBADA";

  function actualizar(variable: string, campo: "valoracion" | "observaciones", valor: string) {
    setValores((prev) => ({ ...prev, [variable]: { ...prev[variable], [campo]: valor } }));
  }

  async function guardar(finalizar: boolean) {
    setLoading(finalizar ? "finalizar" : "borrador");
    setError(null);

    const res = await fetch(`/api/instructor/evaluaciones/${evaluacion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variables: Object.entries(valores).map(([variable, v]) => ({
          variable,
          valoracion: v.valoracion || null,
          observaciones: v.observaciones || null,
        })),
        retroalimentacionInstructor: retroInstructor || null,
        retroalimentacionCoformador: retroCoformador || null,
        juicioFinal: juicioFinal || null,
        finalizar,
      }),
    });

    setLoading(null);

    if (!res.ok) {
      const data = await res.json();
      setError(
        data.error?._root?.[0] ?? data.error?.juicioFinal?.[0] ?? "No se pudo guardar la evaluación."
      );
      return;
    }

    onSaved();
  }

  return (
    <div className="flex flex-col gap-5">
      {evaluacion.videollamadaUrl && (
        <a
          href={evaluacion.videollamadaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit text-sm text-emerald-700 underline dark:text-emerald-500"
        >
          Ver enlace de la videollamada
        </a>
      )}

      <RubricaGrupo
        titulo="Técnicas"
        variables={VARIABLES_TECNICAS}
        valores={valores}
        onChange={actualizar}
        disabled={bloqueado}
      />
      <RubricaGrupo
        titulo="Actitudinales"
        variables={VARIABLES_ACTITUDINALES}
        valores={valores}
        onChange={actualizar}
        disabled={bloqueado}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Retroalimentación al aprendiz
        </label>
        <textarea
          value={retroInstructor}
          onChange={(e) => setRetroInstructor(e.target.value)}
          disabled={bloqueado}
          rows={2}
          className={inputClass}
        />
      </div>

      {evaluacion.numero === 3 && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Retroalimentación del coformador
            </label>
            <textarea
              value={retroCoformador}
              onChange={(e) => setRetroCoformador(e.target.value)}
              disabled={bloqueado}
              rows={2}
              className={inputClass}
              placeholder="Lo que el coformador comentó en la reunión"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Juicio final
            </label>
            <select
              value={juicioFinal}
              onChange={(e) => setJuicioFinal(e.target.value as typeof juicioFinal)}
              disabled={bloqueado}
              className={inputClass}
            >
              <option value="">Sin definir</option>
              {JuicioEtapaProductivaValues.map((j) => (
                <option key={j} value={j}>
                  {juicioEtapaProductivaLabel[j]}
                </option>
              ))}
            </select>
          </div>
          {evaluacion.retroalimentacionAprendiz && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Comentario del aprendiz
              </p>
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {evaluacion.retroalimentacionAprendiz}
              </p>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!bloqueado ? (
        <div className="flex gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => guardar(true)}
            disabled={loading !== null}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading === "finalizar" ? "Finalizando..." : "Finalizar evaluación"}
          </button>
          <button
            type="button"
            onClick={() => guardar(false)}
            disabled={loading !== null}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            {loading === "borrador" ? "Guardando..." : "Guardar borrador"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-emerald-700 dark:text-emerald-500">
          Evaluación finalizada — ya no se puede editar.
        </p>
      )}
    </div>
  );
}

function RubricaGrupo({
  titulo,
  variables,
  valores,
  onChange,
  disabled,
}: {
  titulo: string;
  variables: string[];
  valores: Record<string, { valoracion: string; observaciones: string }>;
  onChange: (variable: string, campo: "valoracion" | "observaciones", valor: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {titulo}
      </p>
      <div className="flex flex-col gap-3">
        {variables.map((variable) => (
          <div key={variable} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-zinc-800 dark:text-zinc-200">
                {variableLabel[variable as keyof typeof variableLabel]}
              </span>
              <select
                value={valores[variable]?.valoracion ?? ""}
                onChange={(e) => onChange(variable, "valoracion", e.target.value)}
                disabled={disabled}
                className={`${inputClass} w-48`}
              >
                <option value="">Sin valorar</option>
                {ValoracionVariableValues.map((v) => (
                  <option key={v} value={v}>
                    {valoracionVariableLabel[v]}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={valores[variable]?.observaciones ?? ""}
              onChange={(e) => onChange(variable, "observaciones", e.target.value)}
              disabled={disabled}
              placeholder="Observación (opcional)"
              className={`${inputClass} mt-2 w-full`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
