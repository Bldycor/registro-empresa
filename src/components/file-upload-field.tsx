"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

const MAX_INTENTOS = 3;

// Errores de red/token contra Vercel Blob son casi siempre transitorios (conexión inestable del
// aprendiz, un timeout puntual) — se reintentan solos antes de mostrarle nada al usuario. Errores
// de validación (tipo de archivo no permitido, etc.) no se reintentan: reintentar no los arregla.
function esErrorTransitorio(err: unknown): boolean {
  const mensaje = err instanceof Error ? err.message : String(err);
  return /client token|network|fetch|timeout|ECONN|failed to retrieve/i.test(mensaje);
}

function mensajeAmigable(err: unknown): string {
  if (esErrorTransitorio(err)) {
    return "No se pudo conectar con el almacenamiento de archivos. Verifica tu conexión e inténtalo de nuevo.";
  }
  return err instanceof Error ? err.message : "No se pudo subir el archivo.";
}

export function FileUploadField({
  label,
  pathPrefix,
  value,
  onChange,
  error,
  required,
}: {
  label: string;
  pathPrefix: string;
  value: string | null;
  onChange: (url: string) => void;
  error?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setUploadError(null);
    setArchivoPendiente(file);

    let ultimoError: unknown = null;

    for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
      try {
        const result = await upload(`${pathPrefix}/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        onChange(result.url);
        setArchivoPendiente(null);
        setLoading(false);
        return;
      } catch (err) {
        ultimoError = err;
        if (!esErrorTransitorio(err)) break;
        if (intento < MAX_INTENTOS) {
          await new Promise((resolve) => setTimeout(resolve, 800 * intento));
        }
      }
    }

    setUploadError(mensajeAmigable(ultimoError));
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-50 dark:file:text-zinc-900"
      />

      {loading && <p className="text-xs text-zinc-500 dark:text-zinc-400">Subiendo…</p>}
      {value && !loading && (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-emerald-700 underline dark:text-emerald-500"
        >
          Ver documento adjunto
        </a>
      )}
      {uploadError && !loading && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-red-600">{uploadError}</p>
          {archivoPendiente && (
            <button
              type="button"
              onClick={() => handleFile(archivoPendiente)}
              className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
