"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

const MAX_INTENTOS = 4;

// Antes solo se reintentaba si el mensaje de error coincidía con un patrón de "error de red" —
// pero cualquier falla del lado del servidor (una consulta a la base de datos que tarda al
// "despertar" desde inactividad, por ejemplo) le llega al cliente empaquetada por el SDK de
// Vercel Blob en el mismo mensaje genérico en inglés, sin distinción de causa. Reintentar siempre
// es más simple y más robusto que tratar de adivinar por el texto del error.
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
        console.error(`[FileUploadField] intento ${intento}/${MAX_INTENTOS} fallido:`, err);
        if (intento < MAX_INTENTOS) {
          await new Promise((resolve) => setTimeout(resolve, 700 * intento));
        }
      }
    }

    console.error("[FileUploadField] subida fallida tras agotar reintentos:", ultimoError);
    setUploadError(
      "No se pudo subir el archivo tras varios intentos. Verifica tu conexión y usa el botón Reintentar, o recarga la página si el problema sigue."
    );
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
              className="shrink-0 text-sm font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
