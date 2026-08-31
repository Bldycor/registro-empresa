"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatePickerField } from "@/components/date-picker-field";
import { TimeSlotPicker } from "@/components/time-slot-picker";
import {
  ModalidadEjecucionEPValues,
  modalidadEjecucionEPLabel,
  valoracionVariableLabel,
  juicioEtapaProductivaLabel,
  type ModalidadEjecucionEPValue,
} from "@/lib/validations";
import { VARIABLES_TECNICAS, VARIABLES_ACTITUDINALES, variableLabel } from "@/lib/evaluacion-variables";

export type EvaluacionMomentoData = {
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
  variables: {
    variable: string;
    categoria: "TECNICO" | "ACTITUDINAL";
    valoracion: "SATISFACTORIO" | "POR_MEJORAR" | null;
    observaciones: string | null;
  }[];
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function formatoFechaLegible(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const TITULOS: Record<number, string> = {
  2: "Momento 2 — Seguimiento",
  3: "Momento 3 — Cierre",
};

export function EvaluacionMomento({
  numero,
  data,
  instructorNombre,
}: {
  numero: 2 | 3;
  data: EvaluacionMomentoData | null;
  instructorNombre: string | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(!data);
  const [fecha, setFecha] = useState(data?.fecha?.slice(0, 10) ?? "");
  const [horaInicio, setHoraInicio] = useState(data?.horaInicio ?? "");
  const [horaFin, setHoraFin] = useState(data?.horaFin ?? "");
  const [modalidad, setModalidad] = useState<ModalidadEjecucionEPValue | "">(
    data?.modalidad ?? ""
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const [retroTexto, setRetroTexto] = useState(data?.retroalimentacionAprendiz ?? "");
  const [retroLoading, setRetroLoading] = useState(false);
  const [retroGuardada, setRetroGuardada] = useState(false);

  async function agendar(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const res = await fetch("/api/etapa-productiva/evaluaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numero, fecha, horaInicio, horaFin, modalidad }),
    });

    const resData = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (typeof resData.error === "string") {
        setErrors({ _root: [resData.error] });
      } else {
        setErrors(resData.error ?? {});
      }
      return;
    }

    setEditando(false);
    router.refresh();
  }

  async function guardarRetro() {
    if (!data) return;
    setRetroLoading(true);
    setRetroGuardada(false);
    const res = await fetch(`/api/etapa-productiva/evaluaciones/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retroalimentacionAprendiz: retroTexto }),
    });
    setRetroLoading(false);
    if (res.ok) {
      setRetroGuardada(true);
      router.refresh();
    }
  }

  const finalizada = data?.estado === "APROBADA";

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{TITULOS[numero]}</h2>
        {data && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              finalizada
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400"
            }`}
          >
            {finalizada ? "Evaluada" : "Pendiente de evaluación"}
          </span>
        )}
      </div>

      {!instructorNombre && (
        <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Tu ficha todavía no tiene un instructor asignado — no puedes agendar esta reunión hasta
          que el coordinador lo asigne.
        </p>
      )}

      {instructorNombre && editando && (
        <form onSubmit={agendar} className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Reunión con tu instructor, <strong>{instructorNombre}</strong>. Elige fecha y franja
            horaria de al menos una hora.
          </p>

          <DatePickerField label="Fecha" required value={fecha} onChange={setFecha} min={new Date().toISOString().slice(0, 10)} />

          <TimeSlotPicker
            tipo="evaluacion"
            fecha={fecha || null}
            horaInicio={horaInicio || null}
            horaFin={horaFin || null}
            onChange={({ horaInicio, horaFin }) => {
              setHoraInicio(horaInicio);
              setHoraFin(horaFin);
            }}
          />
          {errors.horaInicio && <p className="text-sm text-red-600">{errors.horaInicio[0]}</p>}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Modalidad</label>
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value as ModalidadEjecucionEPValue)}
              className={inputClass}
              required
            >
              <option value="" disabled>
                Selecciona
              </option>
              {ModalidadEjecucionEPValues.map((m) => (
                <option key={m} value={m}>
                  {modalidadEjecucionEPLabel[m]}
                </option>
              ))}
            </select>
          </div>

          {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !fecha || !horaInicio || !horaFin || !modalidad}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {loading ? "Agendando..." : data ? "Guardar cambios" : "Agendar reunión"}
            </button>
            {data && (
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {instructorNombre && !editando && data && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Fecha
                </p>
                <p className="text-sm capitalize text-zinc-800 dark:text-zinc-200">
                  {data.fecha ? formatoFechaLegible(data.fecha.slice(0, 10)) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Hora
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                  {data.horaInicio} - {data.horaFin}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Modalidad
                </p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                  {data.modalidad ? modalidadEjecucionEPLabel[data.modalidad] : "—"}
                </p>
              </div>
            </div>
            {data.videollamadaUrl && (
              <a
                href={data.videollamadaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
              >
                Unirse a la videollamada
              </a>
            )}
            {!finalizada && (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="w-fit text-sm font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Reagendar
              </button>
            )}
          </div>

          {!finalizada && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Tu instructor todavía no ha registrado esta evaluación. Cuando la finalice, verás
              aquí la rúbrica y sus observaciones.
            </p>
          )}

          {finalizada && (
            <RubricaResultados data={data} />
          )}

          {finalizada && numero === 3 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Tu comentario sobre este cierre (opcional)
              </label>
              <textarea
                value={retroTexto}
                onChange={(e) => setRetroTexto(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="Escribe tu reflexión sobre el cierre de la Etapa Productiva"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={guardarRetro}
                  disabled={retroLoading}
                  className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {retroLoading ? "Guardando..." : "Guardar comentario"}
                </button>
                {retroGuardada && (
                  <span className="text-sm text-emerald-700 dark:text-emerald-500">Guardado</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RubricaResultados({ data }: { data: EvaluacionMomentoData }) {
  const porVariable = new Map(data.variables.map((v) => [v.variable, v]));

  return (
    <div className="flex flex-col gap-4">
      <RubricaGrupo titulo="Técnicas" variables={VARIABLES_TECNICAS} porVariable={porVariable} />
      <RubricaGrupo titulo="Actitudinales" variables={VARIABLES_ACTITUDINALES} porVariable={porVariable} />

      {data.juicioFinal && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Juicio final
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${
              data.juicioFinal === "APROBADO"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
            }`}
          >
            {juicioEtapaProductivaLabel[data.juicioFinal]}
          </span>
        </div>
      )}

      {data.retroalimentacionInstructor && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Retroalimentación del instructor
          </p>
          <p className="text-sm text-zinc-800 dark:text-zinc-200">{data.retroalimentacionInstructor}</p>
        </div>
      )}
      {data.retroalimentacionCoformador && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Retroalimentación del coformador
          </p>
          <p className="text-sm text-zinc-800 dark:text-zinc-200">{data.retroalimentacionCoformador}</p>
        </div>
      )}
    </div>
  );
}

function RubricaGrupo({
  titulo,
  variables,
  porVariable,
}: {
  titulo: string;
  variables: string[];
  porVariable: Map<string, EvaluacionMomentoData["variables"][number]>;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {titulo}
      </p>
      <ul className="flex flex-col gap-2">
        {variables.map((variable) => {
          const v = porVariable.get(variable);
          return (
            <li
              key={variable}
              className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-800 dark:text-zinc-200">{variableLabel[variable as keyof typeof variableLabel]}</span>
                {v?.valoracion ? (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      v.valoracion === "SATISFACTORIO"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400"
                    }`}
                  >
                    {valoracionVariableLabel[v.valoracion]}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-zinc-400">Sin valorar</span>
                )}
              </div>
              {v?.observaciones && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{v.observaciones}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
