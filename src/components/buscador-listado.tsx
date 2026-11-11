"use client";

import { useEffect, useRef, useState } from "react";

// Búsqueda instantánea sobre una tabla ya pintada por el servidor (10 nov 2026): filtra las filas
// por texto (atributo `data-buscar`) y por situación (`data-grupo`), sin volver a consultar.
export function BuscadorListado({
  grupos,
  children,
}: {
  grupos: { valor: string; etiqueta: string; cantidad: number }[];
  children: React.ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const [grupo, setGrupo] = useState("");
  const [visibles, setVisibles] = useState<number | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filas = caja.current?.querySelectorAll<HTMLTableRowElement>("tbody tr[data-buscar]") ?? [];
    const buscado = texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
    let n = 0;
    filas.forEach((tr) => {
      const ok = (!buscado || (tr.dataset.buscar ?? "").includes(buscado)) && (!grupo || tr.dataset.grupo === grupo);
      tr.hidden = !ok;
      if (ok) n++;
    });
    // Contar las filas visibles es leer el DOM que este efecto acaba de cambiar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibles(texto || grupo ? n : null);
  }, [texto, grupo]);

  return (
    <div ref={caja} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar por nombre, documento, ficha, empresa o instructor"
          aria-label="Buscar en el listado"
          className="w-full max-w-md rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por situación">
          {[{ valor: "", etiqueta: "Todos", cantidad: -1 }, ...grupos.filter((g) => g.cantidad > 0)].map((g) => (
            <button
              key={g.valor}
              type="button"
              aria-pressed={grupo === g.valor}
              onClick={() => setGrupo(g.valor)}
              className={`rounded-full border px-3 py-0.5 text-xs ${
                grupo === g.valor
                  ? "border-azul bg-azul text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-azul dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              }`}
            >
              {g.etiqueta}
              {g.cantidad >= 0 && ` · ${g.cantidad}`}
            </button>
          ))}
        </div>
        {visibles !== null && (
          <span role="status" className="text-xs text-zinc-500 dark:text-zinc-400">
            {visibles} {visibles === 1 ? "aprendiz" : "aprendices"}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
