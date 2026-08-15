"use client";

import { useEffect, useState } from "react";
import { toMinutes, rangesOverlap } from "@/lib/time";

type OcupadoSlot = { horaInicio: string; horaFin: string };

const DURATIONS = [
  { label: "1 hora", minutes: 60 },
  { label: "1 hora 30 min", minutes: 90 },
  { label: "2 horas", minutes: 120 },
  { label: "2 horas 30 min", minutes: 150 },
  { label: "3 horas", minutes: 180 },
];

const BUSINESS_START = 7 * 60; // 07:00
const BUSINESS_END = 18 * 60; // 18:00
const STEP = 30; // minutos entre horas de inicio disponibles

function toHHMM(mins: number) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function TimeSlotPicker({
  fecha,
  horaInicio,
  horaFin,
  onChange,
}: {
  fecha: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  onChange: (values: { horaInicio: string; horaFin: string }) => void;
}) {
  const [ocupados, setOcupados] = useState<OcupadoSlot[]>([]);
  const [duracion, setDuracion] = useState(() =>
    horaInicio && horaFin ? toMinutes(horaFin) - toMinutes(horaInicio) : 60
  );

  useEffect(() => {
    if (!fecha) return;
    let cancelled = false;
    fetch(`/api/etapa-productiva/disponibilidad?fecha=${fecha}`)
      .then((res) => (res.ok ? res.json() : { ocupados: [] }))
      .then((data) => {
        if (!cancelled) setOcupados(data.ocupados ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [fecha]);

  if (!fecha) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Selecciona primero una fecha para ver los horarios disponibles.
      </p>
    );
  }

  const starts: number[] = [];
  for (let t = BUSINESS_START; t + duracion <= BUSINESS_END; t += STEP) {
    starts.push(t);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Duración
        </label>
        <select
          value={duracion}
          onChange={(e) => {
            setDuracion(Number(e.target.value));
            onChange({ horaInicio: "", horaFin: "" });
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        >
          {DURATIONS.map((d) => (
            <option key={d.minutes} value={d.minutes}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Hora de inicio disponible
        </label>
        {starts.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No hay horarios disponibles para esa duración en el horario laboral (7:00 -
            18:00). Elige una duración más corta.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {starts.map((start) => {
              const end = start + duracion;
              const conflict = ocupados.some((o) =>
                rangesOverlap(toHHMM(start), toHHMM(end), o.horaInicio, o.horaFin)
              );
              const selected =
                horaInicio === toHHMM(start) && horaFin === toHHMM(end);
              return (
                <button
                  key={start}
                  type="button"
                  disabled={conflict}
                  title={conflict ? "Horario ocupado por otro aprendiz" : undefined}
                  onClick={() =>
                    onChange({ horaInicio: toHHMM(start), horaFin: toHHMM(end) })
                  }
                  className={`rounded-md border px-2 py-1.5 text-sm transition-colors ${
                    selected
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : conflict
                        ? "cursor-not-allowed border-zinc-200 text-zinc-300 line-through dark:border-zinc-800 dark:text-zinc-700"
                        : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {toHHMM(start)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {horaInicio && horaFin && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Franja seleccionada: <strong>{horaInicio} - {horaFin}</strong>
        </p>
      )}
    </div>
  );
}
