"use client";

import { useEffect, useState } from "react";

// Parámetros del centro para el formato GFPI-F-023. Se escriben una sola vez y entran solos en los
// tres momentos de todos los aprendices, para que ninguno los teclee —ni los teclee mal—.
// Lo que quede vacío sale en blanco en el formato: no se inventa ningún valor.

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

type Config = { regional: string; centroFormacion: string; estrategiaFormativa: string };

const VACIA: Config = { regional: "", centroFormacion: "", estrategiaFormativa: "" };

const CAMPOS: [keyof Config, string, string][] = [
  ["regional", "Regional", "Como aparece en el encabezado del formato. Por ejemplo: Regional Antioquia."],
  ["centroFormacion", "Centro de formación", "El nombre completo del centro."],
  [
    "estrategiaFormativa",
    "Estrategia formativa",
    "La que aplica a los aprendices del centro. Si varía entre programas, escribe la más común y el instructor la corrige en el formato impreso.",
  ],
];

export function ConfiguracionCentroForm() {
  const [config, setConfig] = useState<Config | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/coordinador/configuracion")
      .then((res) => res.json())
      .then((data) =>
        setConfig({
          regional: data.configuracion?.regional ?? "",
          centroFormacion: data.configuracion?.centroFormacion ?? "",
          estrategiaFormativa: data.configuracion?.estrategiaFormativa ?? "",
        }),
      )
      .catch(() => setConfig(VACIA));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setGuardando(true);
    setAviso(null);
    setError(null);
    const res = await fetch("/api/coordinador/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setGuardando(false);
    if (!res.ok) {
      setError("No se pudo guardar.");
      return;
    }
    setAviso("Guardado. Desde ahora entra solo en el formato de los tres momentos.");
  }

  if (!config) return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;

  const faltan = CAMPOS.filter(([clave]) => !config[clave].trim()).map(([, etiqueta]) => etiqueta);

  return (
    <form
      onSubmit={guardar}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {CAMPOS.map(([clave, etiqueta, ayuda]) => (
        <label key={clave} className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          {etiqueta}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{ayuda}</span>
          <input
            type="text"
            value={config[clave]}
            onChange={(e) => setConfig({ ...config, [clave]: e.target.value })}
            maxLength={200}
            className={inputClass}
          />
        </label>
      ))}

      {faltan.length > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          Sin llenar: {faltan.join(", ")}. Mientras tanto esos campos salen en blanco en el formato
          de todos los aprendices.
        </p>
      )}
      {aviso && (
        <p className="rounded-md bg-sena-claro px-3 py-2 text-sm text-azul dark:bg-emerald-900/20 dark:text-emerald-400">
          {aviso}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={guardando}
        className="w-fit rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
      >
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
