"use client";

import { useState } from "react";

type Instructor = { id: string; nombres: string; apellidos: string; email: string };

type Aprendiz = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  estado: "ACTIVO" | "CERTIFICADO";
};

type Ficha = {
  id: string;
  codigo: string;
  instructorId: string | null;
  instructor: Instructor | null;
  _count: { aprendices: number };
  aprendices: Aprendiz[];
};

export function CoordinadorFichasPanel({
  initialFichas,
  instructores,
}: {
  initialFichas: Ficha[];
  instructores: Instructor[];
}) {
  const [fichas, setFichas] = useState<Ficha[]>(initialFichas);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ creadas: string[]; yaExistian: string[] } | null>(
    null
  );
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(fichaId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fichaId)) {
        next.delete(fichaId);
      } else {
        next.add(fichaId);
      }
      return next;
    });
  }

  async function refetchFichas() {
    const res = await fetch("/api/coordinador/fichas");
    if (res.ok) {
      const data = await res.json();
      setFichas(data.fichas ?? []);
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBulkLoading(true);
    setBulkError(null);
    setBulkResult(null);

    const res = await fetch("/api/coordinador/fichas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigos: bulkText }),
    });

    const data = await res.json();
    setBulkLoading(false);

    if (!res.ok) {
      setBulkError(data.error ?? "No se pudieron crear las fichas.");
      return;
    }

    setBulkResult(data);
    setBulkText("");
    await refetchFichas();
  }

  async function handleAssign(fichaId: string, instructorId: string) {
    setAssigningId(fichaId);
    const res = await fetch(`/api/coordinador/fichas/${fichaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructorId: instructorId || null }),
    });
    setAssigningId(null);

    if (!res.ok) return;

    const data = await res.json();
    setFichas((prev) => prev.map((f) => (f.id === fichaId ? { ...f, ...data.ficha } : f)));
  }

  return (
    <div className="w-full max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Fichas
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Precarga las fichas activas antes de que los aprendices se registren, y asigna el
          instructor autorizado para evaluar cada una.
        </p>
      </div>

      <form
        onSubmit={handleBulkSubmit}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Cargar fichas
        </label>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Pega los códigos de ficha, uno por línea (o separados por coma). Las que ya existan se
          ignoran.
        </p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={5}
          placeholder={"2758901\n2856789\n2856790"}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        {bulkError && <p className="mt-2 text-sm text-red-600">{bulkError}</p>}
        {bulkResult && (
          <p className="mt-2 text-sm text-green-600">
            {bulkResult.creadas.length} ficha(s) creada(s)
            {bulkResult.yaExistian.length > 0
              ? `, ${bulkResult.yaExistian.length} ya existían`
              : ""}
            .
          </p>
        )}
        <button
          type="submit"
          disabled={bulkLoading || bulkText.trim().length === 0}
          className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {bulkLoading ? "Cargando..." : "Cargar fichas"}
        </button>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {fichas.length} ficha(s) registrada(s)
          </h2>
        </div>
        {fichas.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no hay fichas cargadas.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {fichas.map((ficha) => {
              const isExpanded = expandedIds.has(ficha.id);
              const tieneAprendices = ficha._count.aprendices > 0;
              return (
                <li key={ficha.id}>
                  <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => tieneAprendices && toggleExpanded(ficha.id)}
                      disabled={!tieneAprendices}
                      aria-expanded={isExpanded}
                      className="flex items-center gap-2 text-left disabled:cursor-default"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        } ${tieneAprendices ? "" : "opacity-0"}`}
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {ficha.codigo}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {ficha._count.aprendices} aprendiz(es)
                          {tieneAprendices ? (isExpanded ? " — ocultar" : " — ver") : ""}
                        </p>
                      </span>
                    </button>
                    <select
                      value={ficha.instructorId ?? ""}
                      onChange={(e) => handleAssign(ficha.id, e.target.value)}
                      disabled={assigningId === ficha.id}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <option value="">Sin instructor asignado</option>
                      {instructores.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.nombres} {instructor.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isExpanded && tieneAprendices && (
                    <div className="bg-zinc-50 px-6 pb-4 dark:bg-zinc-950/40">
                      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                        {ficha.aprendices.map((aprendiz) => (
                          <li
                            key={aprendiz.id}
                            className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                          >
                            <div>
                              <p className="text-zinc-900 dark:text-zinc-50">
                                {aprendiz.nombres} {aprendiz.apellidos}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Cédula: {aprendiz.cedula}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                aprendiz.estado === "CERTIFICADO"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}
                            >
                              {aprendiz.estado === "CERTIFICADO" ? "Certificado" : "Activo"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
