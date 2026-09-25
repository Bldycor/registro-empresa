"use client";

import { useEffect, useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";
import { FileUploadField } from "@/components/file-upload-field";
import {
  TipoNovedadEPValues,
  tipoNovedadEPLabel,
  type TipoNovedadEPValue,
} from "@/lib/validations";
import { fechaEnColombia, formatoMomento, textoPlazo, type EstadoPlazo } from "@/lib/plazos-institucionales";

// Novedades de la etapa productiva del propio aprendiz (guía GFPI-G-040 §9.2). No se avalan: se
// registran, y el sistema muestra si se hicieron dentro de los plazos (3 días hábiles para
// registrarla, 5 para dejarla anotada en la bitácora). Los plazos solo advierten.

export type NovedadItem = {
  id: string;
  origen: "NOVEDAD" | "INTERRUPCION" | "APLAZAMIENTO";
  etiquetaOrigen: string;
  tipo: string;
  descripcion: string;
  fechaHecho: string;
  registradaEn: string;
  soporteUrl: string | null;
  registradaPor: string | null;
  bitacoraNumero: number | null;
  fechaAnotacionBitacora: string | null;
  observacionesInstructor: string | null;
  estado: string | null;
  plazoRegistro: EstadoPlazo | null;
  plazoBitacora: EstadoPlazo | null;
  aprendiz: { id: string; nombre: string; cedula: string; ficha: string | null };
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// Día de calendario guardado a medianoche UTC.
export function diaLegible(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}

export function PlazoTexto({ plazo, etiqueta }: { plazo: EstadoPlazo | null; etiqueta: string }) {
  if (!plazo) return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        plazo.vencido
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
      }`}
    >
      {etiqueta}: {plazo.vencido ? "fuera de plazo" : "a tiempo"} · {textoPlazo(plazo)}
    </span>
  );
}

export function NovedadTarjeta({ novedad, children }: { novedad: NovedadItem; children?: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {novedad.tipo}{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">· {novedad.etiquetaOrigen}</span>
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Ocurrió el {diaLegible(novedad.fechaHecho)} · registrada el {formatoMomento(novedad.registradaEn)}
            {novedad.registradaPor ? ` por ${novedad.registradaPor}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <PlazoTexto plazo={novedad.plazoRegistro} etiqueta="Registro" />
          {novedad.plazoBitacora && (
            <PlazoTexto
              plazo={novedad.plazoBitacora}
              etiqueta={novedad.fechaAnotacionBitacora ? "Bitácora" : "Bitácora (pendiente)"}
            />
          )}
        </div>
      </div>

      <p className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">{novedad.descripcion}</p>

      {novedad.fechaAnotacionBitacora && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Anotada en la bitácora {novedad.bitacoraNumero} el {formatoMomento(novedad.fechaAnotacionBitacora)}.
        </p>
      )}
      {novedad.soporteUrl && (
        <a
          href={novedad.soporteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs text-emerald-700 underline dark:text-emerald-500"
        >
          Ver soporte
        </a>
      )}
      {novedad.observacionesInstructor && (
        <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
          <strong>Tu instructor:</strong> {novedad.observacionesInstructor}
        </p>
      )}
      {children}
    </li>
  );
}

export function NovedadesEP({ totalBitacoras }: { totalBitacoras: number }) {
  const [novedades, setNovedades] = useState<NovedadItem[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoNovedadEPValue | "">("");
  const [fechaHecho, setFechaHecho] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [soporteUrl, setSoporteUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [bitacoraElegida, setBitacoraElegida] = useState<Record<string, number>>({});
  const [marcando, setMarcando] = useState<string | null>(null);

  function cargar() {
    fetch("/api/etapa-productiva/novedades")
      .then((res) => res.json())
      .then((data) => setNovedades(data.novedades ?? []));
  }

  useEffect(cargar, []);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const res = await fetch("/api/etapa-productiva/novedades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, fechaHecho, descripcion, soporteUrl }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErrors(typeof data.error === "string" ? { _root: [data.error] } : (data.error ?? {}));
      return;
    }
    setAbierto(false);
    setTipo("");
    setFechaHecho("");
    setDescripcion("");
    setSoporteUrl(null);
    cargar();
  }

  async function marcarBitacora(id: string) {
    const numero = bitacoraElegida[id];
    if (!numero) return;
    setMarcando(id);
    await fetch(`/api/etapa-productiva/novedades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bitacoraNumero: numero }),
    });
    setMarcando(null);
    cargar();
  }

  if (novedades === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="w-fit rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro dark:bg-sena dark:text-white"
        >
          Registrar una novedad
        </button>
      ) : (
        <form
          onSubmit={registrar}
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-sena"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Tipo de novedad <span className="text-red-600">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoNovedadEPValue)}
              className={inputClass}
              required
            >
              <option value="" disabled>
                Selecciona
              </option>
              {TipoNovedadEPValues.map((v) => (
                <option key={v} value={v}>
                  {tipoNovedadEPLabel[v]}
                </option>
              ))}
            </select>
            {errors.tipo && <p className="text-sm text-red-600">{errors.tipo[0]}</p>}
          </div>

          <DatePickerField
            label="¿Qué día ocurrió?"
            required
            value={fechaHecho}
            onChange={setFechaHecho}
            max={fechaEnColombia(new Date())}
            error={errors.fechaHecho?.[0]}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              ¿Qué pasó? <span className="text-red-600">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              maxLength={1000}
              className={inputClass}
              placeholder="Describe la novedad y cómo afecta tu práctica."
            />
            {errors.descripcion && <p className="text-sm text-red-600">{errors.descripcion[0]}</p>}
          </div>

          <FileUploadField
            label="Soporte (opcional)"
            pathPrefix="novedad-ep"
            value={soporteUrl}
            onChange={setSoporteUrl}
            onUploadingChange={setSubiendo}
          />

          {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || subiendo || !tipo || !fechaHecho || descripcion.trim().length < 10}
              className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
            >
              {loading ? "Registrando…" : "Registrar novedad"}
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

      {novedades.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No has registrado novedades.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {novedades.map((n) => (
            <NovedadTarjeta key={`${n.origen}-${n.id}`} novedad={n}>
              {n.origen === "NOVEDAD" && !n.fechaAnotacionBitacora && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Cuando la anotes en tu bitácora, déjalo registrado:
                  </span>
                  <select
                    value={bitacoraElegida[n.id] ?? ""}
                    onChange={(e) =>
                      setBitacoraElegida((prev) => ({ ...prev, [n.id]: Number(e.target.value) }))
                    }
                    className={`${inputClass} py-1.5`}
                  >
                    <option value="">Bitácora…</option>
                    {Array.from({ length: totalBitacoras }, (_, i) => i + 1).map((numero) => (
                      <option key={numero} value={numero}>
                        Bitácora {numero}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!bitacoraElegida[n.id] || marcando === n.id}
                    onClick={() => marcarBitacora(n.id)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {marcando === n.id ? "Guardando…" : "Ya quedó anotada"}
                  </button>
                </div>
              )}
            </NovedadTarjeta>
          ))}
        </ul>
      )}
    </div>
  );
}
