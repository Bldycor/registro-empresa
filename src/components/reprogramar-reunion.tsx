"use client";

import { useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";
import { TimeSlotPicker } from "@/components/time-slot-picker";
import { fechaEnColombia } from "@/lib/plazos-institucionales";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// El instructor mueve una reunión de fecha u hora (requisito §3.2). Al guardar, a todas las
// partes les llega el aviso de «Reunión reprogramada» con el horario anterior y el nuevo, y la
// invitación de calendario se actualiza. La agenda que se muestra es la del instructor.
export function ReprogramarReunion({
  tipo,
  id,
  onDone,
}: {
  tipo: "CONCERTACION" | "EVALUACION";
  id: string;
  onDone: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  function cerrar() {
    setAbierto(false);
    setFecha("");
    setHoraInicio("");
    setHoraFin("");
    setMotivo("");
    setErrors({});
  }

  async function guardar() {
    setLoading(true);
    setErrors({});
    const res = await fetch(`/api/instructor/reuniones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, fecha, horaInicio, horaFin, motivo: motivo.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErrors(
        typeof data.error === "string"
          ? { _root: [data.error] }
          : (data.error ?? { _root: ["No se pudo reprogramar la reunión."] }),
      );
      return;
    }
    cerrar();
    onDone();
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Reprogramar reunión
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Reprogramar reunión</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          A todos les llega el aviso con el horario anterior y el nuevo, y el evento se actualiza en su
          calendario.
        </p>
      </div>
      <DatePickerField
        label="Nueva fecha"
        required
        value={fecha}
        onChange={(v) => {
          setFecha(v);
          setHoraInicio("");
          setHoraFin("");
        }}
        min={fechaEnColombia(new Date())}
        error={errors.fecha?.[0]}
      />
      <TimeSlotPicker
        endpoint="/api/instructor/disponibilidad"
        tipo={tipo === "CONCERTACION" ? "concertacion" : "evaluacion"}
        excluir={id}
        fecha={fecha || null}
        horaInicio={horaInicio || null}
        horaFin={horaFin || null}
        onChange={(v) => {
          setHoraInicio(v.horaInicio);
          setHoraFin(v.horaFin);
        }}
      />
      {errors.horaInicio && <p className="text-sm text-red-600">{errors.horaInicio[0]}</p>}
      {errors.horaFin && <p className="text-sm text-red-600">{errors.horaFin[0]}</p>}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Motivo del cambio <span className="font-normal text-zinc-500">(opcional, va en el aviso)</span>
        </label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          maxLength={300}
          className={inputClass}
        />
        {errors.motivo && <p className="text-sm text-red-600">{errors.motivo[0]}</p>}
      </div>
      {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={loading || !fecha || !horaInicio || !horaFin}
          className="rounded-md bg-sena px-3 py-1.5 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
        >
          {loading ? "Reprogramando…" : "Reprogramar y avisar"}
        </button>
        <button
          type="button"
          onClick={cerrar}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
