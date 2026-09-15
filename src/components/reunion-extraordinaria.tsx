"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatePickerField } from "@/components/date-picker-field";
import { TimeSlotPicker } from "@/components/time-slot-picker";
import {
  ModalidadEjecucionEPValues,
  modalidadEjecucionEPLabel,
  SolicitanteReunionValues,
  solicitanteReunionLabel,
  type ModalidadEjecucionEPValue,
  type SolicitanteReunionValue,
} from "@/lib/validations";
import { fechaEnColombia } from "@/lib/plazos-institucionales";

export type ReunionExtraordinariaData = {
  id: string;
  fecha: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  modalidad: ModalidadEjecucionEPValue | null;
  motivo: string | null;
  solicitadaPor: SolicitanteReunionValue | null;
  estado: string;
  observaciones: string | null;
  videollamadaUrl: string | null;
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

const estadoEstilo: Record<string, { clase: string; texto: string }> = {
  PENDIENTE: {
    clase: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
    texto: "Por aprobar",
  },
  APROBADA: {
    clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
    texto: "Aprobada",
  },
  RECHAZADA: {
    clase: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
    texto: "No aprobada",
  },
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

// Reunión extraordinaria (requisito §3.2): el aprendiz la propone —a nombre propio o de su
// coformador— y su instructor la aprueba o la rechaza. Solo al aprobarla sale la citación con el
// enlace a todos, así que mientras está por aprobar no hay videollamada que mostrar.
export function ReunionExtraordinaria({
  instructorNombre,
  reuniones,
  procesoCerrado,
}: {
  instructorNombre: string | null;
  reuniones: ReunionExtraordinariaData[];
  procesoCerrado: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [solicitadaPor, setSolicitadaPor] = useState<SolicitanteReunionValue>("APRENDIZ");
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadEjecucionEPValue | "">("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [retirando, setRetirando] = useState<string | null>(null);

  const pendiente = reuniones.find((r) => r.estado === "PENDIENTE");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const res = await fetch("/api/etapa-productiva/extraordinarias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solicitadaPor, motivo, fecha, horaInicio, horaFin, modalidad }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErrors(typeof data.error === "string" ? { _root: [data.error] } : (data.error ?? {}));
      return;
    }
    setAbierto(false);
    setMotivo("");
    setFecha("");
    setHoraInicio("");
    setHoraFin("");
    setModalidad("");
    router.refresh();
  }

  async function retirar(id: string) {
    setRetirando(id);
    await fetch(`/api/etapa-productiva/extraordinarias/${id}`, { method: "DELETE" });
    setRetirando(null);
    router.refresh();
  }

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Reunión extraordinaria</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Si surge un problema o una eventualidad, tú o tu coformador pueden pedir una reunión adicional
        con tu instructor. Propón la fecha y la hora; cuando tu instructor la apruebe, les llega a
        todos la citación con el enlace.
      </p>

      {reuniones.length > 0 && (
        <ul className="mt-4 space-y-2">
          {reuniones.map((r) => {
            const estilo = estadoEstilo[r.estado] ?? { clase: "", texto: r.estado };
            return (
              <li key={r.id} className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="capitalize text-zinc-800 dark:text-zinc-200">
                    {r.fecha ? fechaLegible(r.fecha) : "—"} · {r.horaInicio}–{r.horaFin}
                    {r.modalidad && (
                      <span className="normal-case"> · {modalidadEjecucionEPLabel[r.modalidad]}</span>
                    )}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${estilo.clase}`}>
                    {estilo.texto}
                  </span>
                </div>
                {r.motivo && (
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Motivo: {r.motivo}
                    {r.solicitadaPor === "COFORMADOR" && " · pedida por el coformador"}
                  </p>
                )}
                {r.observaciones && (
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Tu instructor: {r.observaciones}
                  </p>
                )}
                {r.estado === "APROBADA" && r.videollamadaUrl && (
                  <a
                    href={r.videollamadaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    Unirse a la videollamada
                  </a>
                )}
                {r.estado === "PENDIENTE" && (
                  <button
                    type="button"
                    onClick={() => retirar(r.id)}
                    disabled={retirando === r.id}
                    className="mt-2 block text-xs font-medium text-zinc-500 underline hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {retirando === r.id ? "Retirando…" : "Retirar solicitud"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {procesoCerrado ? null : !instructorNombre ? (
        <p className="mt-4 rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Tu ficha todavía no tiene un instructor asignado.
        </p>
      ) : pendiente ? (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
          Tu solicitud está esperando la respuesta de tu instructor.
        </p>
      ) : !abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-4 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Pedir una reunión extraordinaria
        </button>
      ) : (
        <form onSubmit={enviar} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">¿Quién la pide?</label>
            <select
              value={solicitadaPor}
              onChange={(e) => setSolicitadaPor(e.target.value as SolicitanteReunionValue)}
              className={inputClass}
            >
              {SolicitanteReunionValues.map((v) => (
                <option key={v} value={v}>
                  {solicitanteReunionLabel[v]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Motivo <span className="text-red-600">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              className={inputClass}
              placeholder="¿Qué pasó y qué necesitan tratar con el instructor?"
            />
            {errors.motivo && <p className="text-sm text-red-600">{errors.motivo[0]}</p>}
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Reunión con tu instructor, <strong>{instructorNombre}</strong>. Elige fecha y una franja
            de al menos una hora.
          </p>
          <DatePickerField
            label="Fecha"
            required
            value={fecha}
            onChange={setFecha}
            min={fechaEnColombia(new Date())}
            error={errors.fecha?.[0]}
          />
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
          {errors.horaFin && <p className="text-sm text-red-600">{errors.horaFin[0]}</p>}

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
              disabled={loading || !fecha || !horaInicio || !horaFin || !modalidad || motivo.trim().length < 10}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {loading ? "Enviando…" : "Enviar solicitud"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
