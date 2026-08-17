"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConcertacionSchema, type ConcertacionInput } from "@/lib/validations";
import { DatePicker } from "@/components/date-picker";
import { TimeSlotPicker } from "@/components/time-slot-picker";

const emptyValues: ConcertacionInput = { fecha: "", horaInicio: "", horaFin: "" };

function formatFechaLegible(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ConcertacionForm({
  initialData,
  videollamadaUrl,
}: {
  initialData: ConcertacionInput | null;
  videollamadaUrl: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [enlace, setEnlace] = useState<string | null>(videollamadaUrl);
  const [citaActual, setCitaActual] = useState<ConcertacionInput | null>(initialData);
  const [editando, setEditando] = useState(!initialData);

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ConcertacionInput>({
    resolver: zodResolver(ConcertacionSchema),
    defaultValues: initialData ?? emptyValues,
  });

  useEffect(() => {
    reset(initialData ?? emptyValues);
    setCitaActual(initialData);
    setEditando(!initialData);
  }, [initialData, reset]);

  useEffect(() => {
    setEnlace(videollamadaUrl);
  }, [videollamadaUrl]);

  const fecha = watch("fecha");
  const horaInicio = watch("horaInicio");
  const horaFin = watch("horaFin");

  async function onSubmit(values: ConcertacionInput) {
    setSaved(false);
    setServerError(null);

    const res = await fetch("/api/etapa-productiva/concertacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.error?.horaInicio) {
        setError("horaInicio", { message: data.error.horaInicio[0] });
      } else if (typeof data.error === "string") {
        setServerError(data.error);
      } else {
        setServerError("No se pudo guardar la cita.");
      }
      return;
    }

    setEnlace(data.concertacion?.videollamadaUrl ?? null);
    setCitaActual(values);
    setSaved(true);
    setEditando(false);
    router.refresh();
  }

  function cancelarEdicion() {
    reset(citaActual ?? emptyValues);
    setEditando(false);
  }

  if (!editando && citaActual) {
    return (
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Concertación de funciones
        </h2>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Primer micro proceso de la etapa productiva.
        </p>

        <div className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Fecha
            </p>
            <p className="text-sm capitalize text-zinc-800 dark:text-zinc-200">
              {formatFechaLegible(citaActual.fecha)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Hora
            </p>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">
              {citaActual.horaInicio} - {citaActual.horaFin}
            </p>
          </div>

          {enlace && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Videollamada
              </p>
              <a
                href={enlace}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Unirse a la videollamada
              </a>
            </div>
          )}
        </div>

        {saved && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              ✓ Proceso completado: concertación de funciones confirmada.
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">
              Se envió una invitación de videoconferencia por correo al aprendiz, al
              coformador y a bcoba@sena.edu.co.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Actualizar cita
          </button>
          <button
            type="button"
            onClick={() => {
              // Igual que en el formulario de empresa: refresh además de push para que el
              // menú lateral (layout compartido) muestre este paso como completado de una vez.
              router.push("/formulario/actualizar");
              router.refresh();
            }}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Ir al panel de datos →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Concertación de funciones
      </h2>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Primer micro proceso de la etapa productiva. Elige una fecha y una franja horaria
        de al menos una hora. No puede cruzarse con la cita ya agendada por otro aprendiz.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fecha
          </label>
          <DatePicker
            value={fecha || null}
            onChange={(date) => {
              setValue("fecha", date, { shouldValidate: true });
              setValue("horaInicio", "", { shouldValidate: false });
              setValue("horaFin", "", { shouldValidate: false });
            }}
          />
          {errors.fecha && <p className="text-sm text-red-600">{errors.fecha.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <TimeSlotPicker
            fecha={fecha || null}
            horaInicio={horaInicio || null}
            horaFin={horaFin || null}
            onChange={({ horaInicio, horaFin }) => {
              setValue("horaInicio", horaInicio, { shouldValidate: true });
              setValue("horaFin", horaFin, { shouldValidate: true });
            }}
          />
          {errors.horaInicio && (
            <p className="text-sm text-red-600">{errors.horaInicio.message}</p>
          )}
          {errors.horaFin && <p className="text-sm text-red-600">{errors.horaFin.message}</p>}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="mt-2 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !fecha || !horaInicio || !horaFin}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "Guardando..." : citaActual ? "Guardar cambios" : "Confirmar cita"}
          </button>

          {citaActual && (
            <button
              type="button"
              onClick={cancelarEdicion}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
