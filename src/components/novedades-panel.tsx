"use client";

import { useEffect, useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";
import { StatBadge } from "@/components/stat-badge";
import { NovedadTarjeta, type NovedadItem } from "@/components/novedades-ep";
import {
  TipoNovedadEPValues,
  tipoNovedadEPLabel,
  type TipoNovedadEPValue,
} from "@/lib/validations";
import { fechaEnColombia } from "@/lib/plazos-institucionales";

// Novedades de los aprendices del instructor (guía GFPI-G-040 §9.2): las lee, puede registrar una
// que le reportaron por fuera y dejar su comentario. No se avalan.

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

export function NovedadesPanel({ aprendices }: { aprendices: { id: string; nombre: string }[] }) {
  const [novedades, setNovedades] = useState<NovedadItem[] | null>(null);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [soloFueraDePlazo, setSoloFueraDePlazo] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [userId, setUserId] = useState("");
  const [tipo, setTipo] = useState<TipoNovedadEPValue | "">("");
  const [fechaHecho, setFechaHecho] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);

  function cargar() {
    fetch("/api/instructor/novedades")
      .then((res) => res.json())
      .then((data) => setNovedades(data.novedades ?? []));
  }

  useEffect(cargar, []);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const res = await fetch("/api/instructor/novedades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, tipo, fechaHecho, descripcion }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErrors(typeof data.error === "string" ? { _root: [data.error] } : (data.error ?? {}));
      return;
    }
    setAbierto(false);
    setUserId("");
    setTipo("");
    setFechaHecho("");
    setDescripcion("");
    cargar();
  }

  async function comentar(id: string) {
    setGuardando(id);
    await fetch(`/api/instructor/novedades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observacionesInstructor: notas[id] ?? "" }),
    });
    setGuardando(null);
    cargar();
  }

  if (novedades === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const fueraDePlazo = novedades.filter((n) => n.plazoRegistro?.vencido).length;
  const sinAnotar = novedades.filter((n) => n.origen === "NOVEDAD" && !n.fechaAnotacionBitacora).length;

  const visibles = novedades.filter((n) => {
    if (soloFueraDePlazo && !n.plazoRegistro?.vencido) return false;
    const texto = filtroTexto.trim().toLowerCase();
    if (texto && !n.aprendiz.nombre.toLowerCase().includes(texto) && !n.aprendiz.cedula.includes(texto)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="azul" etiqueta="novedades" cantidad={novedades.length} />
        <StatBadge tono="ambar" etiqueta="registradas fuera de plazo" cantidad={fueraDePlazo} />
        <StatBadge tono="rojo" etiqueta="sin anotar en bitácora" cantidad={sinAnotar} />
        <input
          type="text"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          placeholder="Buscar por aprendiz o cédula"
          className={`${inputClass} ml-auto w-52 py-1.5`}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={soloFueraDePlazo}
            onChange={(e) => setSoloFueraDePlazo(e.target.checked)}
          />
          Solo fuera de plazo
        </label>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
        >
          {abierto ? "Cancelar" : "Registrar novedad"}
        </button>
      </div>

      {abierto && (
        <form
          onSubmit={registrar}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Para cuando el aprendiz o la empresa te reportan la novedad por fuera de SEPA.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Aprendiz
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass} required>
                <option value="" disabled>
                  Selecciona
                </option>
                {aprendices.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
              {errors.userId && <span className="text-sm text-red-600">{errors.userId[0]}</span>}
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Tipo de novedad
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
            </label>
          </div>
          <DatePickerField
            label="¿Qué día ocurrió?"
            required
            value={fechaHecho}
            onChange={setFechaHecho}
            max={fechaEnColombia(new Date())}
            error={errors.fechaHecho?.[0]}
          />
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            ¿Qué pasó?
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              maxLength={1000}
              className={inputClass}
            />
            {errors.descripcion && <span className="text-sm text-red-600">{errors.descripcion[0]}</span>}
          </label>
          {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
          <button
            type="submit"
            disabled={loading || !userId || !tipo || !fechaHecho || descripcion.trim().length < 10}
            className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? "Registrando…" : "Registrar novedad"}
          </button>
        </form>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay novedades en este filtro.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((n) => (
            <NovedadTarjeta key={`${n.origen}-${n.id}`} novedad={n}>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {n.aprendiz.nombre} · CC {n.aprendiz.cedula} · Ficha {n.aprendiz.ficha ?? "sin asignar"}
              </p>
              {n.origen === "NOVEDAD" && (
                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <textarea
                    placeholder="Tu comentario para el aprendiz (qué se acordó, qué sigue)"
                    value={notas[n.id] ?? n.observacionesInstructor ?? ""}
                    onChange={(e) => setNotas((prev) => ({ ...prev, [n.id]: e.target.value }))}
                    rows={2}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={guardando === n.id}
                    onClick={() => comentar(n.id)}
                    className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {guardando === n.id ? "Guardando…" : "Guardar comentario"}
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
