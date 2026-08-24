"use client";

import { useState } from "react";

type Ficha = { id: string; codigo: string };

type Aprendiz = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  ficha: { id: string; codigo: string; instructorId: string | null } | null;
};

const OTROS_VALUE = "__OTROS__";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// Vista de aprendices del Instructor, organizada por ficha propia — cada ficha asignada es su
// propio grupo (evaluable), y los aprendices que no están a su cargo (sin ficha, o con ficha de
// otro instructor) quedan aparte, en el mismo orden ascendente por nombre que ya trae la consulta
// del servidor (orderBy nombres/apellidos asc — no se reordena acá).
export function InstructorAprendicesPanel({
  aprendices,
  fichasAsignadas,
}: {
  aprendices: Aprendiz[];
  fichasAsignadas: Ficha[];
}) {
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroFicha, setFiltroFicha] = useState("");

  const misFichaIds = new Set(fichasAsignadas.map((f) => f.id));

  const coincideTexto = (a: Aprendiz) => {
    const texto = filtroTexto.trim().toLowerCase();
    if (!texto) return true;
    const nombreCompleto = `${a.nombres} ${a.apellidos}`.toLowerCase();
    return nombreCompleto.includes(texto) || a.cedula.includes(texto);
  };

  const aprendicesFiltrados = aprendices.filter(coincideTexto);

  const grupos = fichasAsignadas
    .filter((f) => !filtroFicha || filtroFicha === f.id)
    .map((f) => ({
      ficha: f,
      aprendices: aprendicesFiltrados.filter((a) => a.ficha?.id === f.id),
    }));

  const otros = aprendicesFiltrados.filter(
    (a) => !a.ficha || !misFichaIds.has(a.ficha.id)
  );
  const mostrarOtros = !filtroFicha || filtroFicha === OTROS_VALUE;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {aprendicesFiltrados.length} de {aprendices.length} aprendiz(es)
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por nombre o cédula"
              className={`${inputClass} w-52`}
            />
            <select
              value={filtroFicha}
              onChange={(e) => setFiltroFicha(e.target.value)}
              className={`${inputClass} text-xs`}
            >
              <option value="">Todas mis fichas</option>
              {fichasAsignadas.map((f) => (
                <option key={f.id} value={f.id}>
                  Ficha {f.codigo}
                </option>
              ))}
              <option value={OTROS_VALUE}>Sin ficha a mi cargo</option>
            </select>
          </div>
        </div>
      </div>

      {aprendices.length === 0 ? (
        <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay aprendices registrados.
        </p>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {grupos.map(({ ficha, aprendices: aprendicesFicha }) => (
            <div key={ficha.id}>
              <div className="flex items-center justify-between bg-zinc-50 px-6 py-2 dark:bg-zinc-950/40">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Ficha {ficha.codigo}
                </h3>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {aprendicesFicha.length} aprendiz(es)
                </span>
              </div>
              {aprendicesFicha.length === 0 ? (
                <p className="px-6 py-3 text-xs text-zinc-400 dark:text-zinc-500">
                  Ningún aprendiz de esta ficha coincide con el filtro.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {aprendicesFicha.map((aprendiz) => (
                    <AprendizRow key={aprendiz.id} aprendiz={aprendiz} evaluable />
                  ))}
                </ul>
              )}
            </div>
          ))}

          {mostrarOtros && (
            <div>
              <div className="flex items-center justify-between bg-zinc-50 px-6 py-2 dark:bg-zinc-950/40">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Sin ficha a mi cargo
                </h3>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {otros.length} aprendiz(es)
                </span>
              </div>
              {otros.length === 0 ? (
                <p className="px-6 py-3 text-xs text-zinc-400 dark:text-zinc-500">
                  Ningún aprendiz coincide con el filtro.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {otros.map((aprendiz) => (
                    <AprendizRow key={aprendiz.id} aprendiz={aprendiz} evaluable={false} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AprendizRow({ aprendiz, evaluable }: { aprendiz: Aprendiz; evaluable: boolean }) {
  return (
    <li className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {aprendiz.nombres} {aprendiz.apellidos}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {aprendiz.email} · Cédula: {aprendiz.cedula}
          {!aprendiz.ficha && " · Sin ficha asignada"}
        </p>
      </div>
      <span
        className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
          evaluable
            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {evaluable ? "Evaluable" : "Solo consulta"}
      </span>
    </li>
  );
}
