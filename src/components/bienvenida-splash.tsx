"use client";

import { useEffect, useState } from "react";

// Saludo breve al entrar: dice para qué sirve el SEPA y qué va a hacer aquí quien inicia sesión.
// Aparece una sola vez por sesión del navegador, se cierra solo a los cinco segundos y se puede
// saltar con un clic o con la tecla Escape. No bloquea nada: si el navegador no deja guardar la
// marca, en el peor caso se vuelve a ver, nunca se queda pegado.
const CLAVE = "sepa:bienvenida";
const DURACION_MS = 5000;

export function BienvenidaSplash({ nombre, mensaje }: { nombre: string; mensaje: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let yaVisto = false;
    try {
      yaVisto = sessionStorage.getItem(CLAVE) === "1";
      sessionStorage.setItem(CLAVE, "1");
    } catch {
      // Sin almacenamiento disponible: se muestra igual.
    }
    if (!yaVisto) setVisible(true);
    // El cierre se programa siempre, incluso si la marca ya estaba puesta: en desarrollo React
    // monta el efecto dos veces y, si en la segunda no se programara, el saludo se quedaría
    // abierto sin temporizador.
    const cierre = setTimeout(() => setVisible(false), DURACION_MS);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      clearTimeout(cierre);
      window.removeEventListener("keydown", escape);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setVisible(false)}
      className="sepa-aparece fixed inset-0 z-50 flex items-center justify-center bg-azul/80 px-4 backdrop-blur-sm print:hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sepa-sube w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        <div className="bg-gradient-to-br from-azul via-azul-claro to-sena px-8 py-7 text-white">
          <span
            aria-hidden
            className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-lg font-bold backdrop-blur"
          >
            SP
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">SENA · SEPA</p>
          <h2 className="text-2xl font-semibold leading-tight">Hola, {nombre}</h2>
        </div>

        <div className="px-8 py-6">
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            El SEPA acompaña la <strong>etapa productiva</strong> de principio a fin: las seis
            evidencias, las reuniones de seguimiento y las novedades del proceso, cada una con su
            fecha y su responsable.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{mensaje}</p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="rounded-lg bg-sena px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sena-oscuro"
            >
              Entrar
            </button>
            <span className="text-xs text-zinc-400">Se cierra solo…</span>
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="sepa-progreso h-full bg-sena" />
          </div>
        </div>
      </div>
    </div>
  );
}
