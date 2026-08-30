"use client";

import { useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import {
  ProgramasFormacionValues,
  TipoCompetenciaValues,
  tipoCompetenciaLabel,
  type ProgramaFormacionValue,
  type TipoCompetenciaValue,
} from "@/lib/validations";

type Competencia = {
  id: string;
  programa: string;
  tipo: TipoCompetenciaValue;
  codigoCompetencia: string;
  nombreCompetencia: string;
  resultadoAprendizaje: string;
  horas: number | null;
  redConocimiento: string | null;
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

const formVacio = {
  tipo: "TECNICA" as TipoCompetenciaValue,
  codigoCompetencia: "",
  nombreCompetencia: "",
  resultadoAprendizaje: "",
  horas: "",
  redConocimiento: "",
};

export function CompetenciasPanel() {
  const [programaFiltro, setProgramaFiltro] = useState<ProgramaFormacionValue | "">("");
  const [competencias, setCompetencias] = useState<Competencia[] | null>(null);

  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    creadas: number;
    actualizadas: number;
    errores: { linea?: number; motivo: string }[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(formVacio);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(formVacio);
  const [editLoading, setEditLoading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load(programa: string) {
    if (!programa) return;
    fetch(`/api/coordinador/competencias?programa=${encodeURIComponent(programa)}`)
      .then((res) => res.json())
      .then((data) => setCompetencias(data.competencias ?? []));
  }

  function handleProgramaChange(programa: ProgramaFormacionValue | "") {
    setProgramaFiltro(programa);
    setCompetencias(null);
    load(programa);
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    const res = await fetch("/api/coordinador/competencias/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: importText }),
    });

    const data = await res.json();
    setImportLoading(false);

    if (!res.ok) {
      setImportError(data.error ?? "No se pudo importar el contenido pegado.");
      return;
    }

    setImportResult(data);
    setImportText("");
    load(programaFiltro);
  }

  async function handleAgregar(e: React.FormEvent) {
    e.preventDefault();
    if (!programaFiltro) return;
    setFormLoading(true);
    setFormError(null);

    const res = await fetch("/api/coordinador/competencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programa: programaFiltro,
        tipo: form.tipo,
        codigoCompetencia: form.codigoCompetencia,
        nombreCompetencia: form.nombreCompetencia,
        resultadoAprendizaje: form.resultadoAprendizaje,
        horas: form.horas ? Number(form.horas) : null,
        redConocimiento: form.redConocimiento || null,
      }),
    });

    const data = await res.json();
    setFormLoading(false);

    if (!res.ok) {
      setFormError(typeof data.error === "string" ? data.error : "No se pudo agregar la competencia.");
      return;
    }

    setForm(formVacio);
    setAgregando(false);
    load(programaFiltro);
  }

  function startEdit(c: Competencia) {
    setEditingId(c.id);
    setEditForm({
      tipo: c.tipo,
      codigoCompetencia: c.codigoCompetencia,
      nombreCompetencia: c.nombreCompetencia,
      resultadoAprendizaje: c.resultadoAprendizaje,
      horas: c.horas != null ? String(c.horas) : "",
      redConocimiento: c.redConocimiento ?? "",
    });
  }

  async function handleGuardarEdicion(id: string) {
    if (!programaFiltro) return;
    setEditLoading(true);

    const res = await fetch(`/api/coordinador/competencias/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        programa: programaFiltro,
        tipo: editForm.tipo,
        codigoCompetencia: editForm.codigoCompetencia,
        nombreCompetencia: editForm.nombreCompetencia,
        resultadoAprendizaje: editForm.resultadoAprendizaje,
        horas: editForm.horas ? Number(editForm.horas) : null,
        redConocimiento: editForm.redConocimiento || null,
      }),
    });

    setEditLoading(false);
    if (!res.ok) return;

    setEditingId(null);
    load(programaFiltro);
  }

  async function handleEliminar(id: string) {
    setDeletingId(id);
    await fetch(`/api/coordinador/competencias/${id}`, { method: "DELETE" });
    setDeletingId(null);
    load(programaFiltro);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleImportSubmit}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Importar desde hoja de cálculo
        </label>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Selecciona en el consolidado oficial las columnas <strong>Denominación de Formación</strong>,{" "}
          <strong>tipo de competencia</strong> (Técnica / Básicas y/o Claves), <strong>Código de
          competencia</strong>, <strong>Nombre de Competencia</strong>, <strong>Resultado de
          aprendizaje</strong>, <strong>Horas de competencia</strong> y <strong>Red de
          conocimiento</strong> (incluir el encabezado ayuda, pero no es obligatorio), copia y pega
          aquí. El <strong>programa</strong> debe coincidir con el catálogo oficial (no distingue
          tildes/mayúsculas). Reimportar el mismo consolidado actualiza las filas existentes en vez
          de duplicarlas.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          placeholder="Pega aquí las filas copiadas de la hoja de cálculo"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
        {importResult && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <StatBadge tono="verde" etiqueta="Creadas" cantidad={importResult.creadas} />
              <StatBadge tono="ambar" etiqueta="Actualizadas" cantidad={importResult.actualizadas} />
              {importResult.errores.length > 0 && (
                <StatBadge tono="rojo" etiqueta="Con errores" cantidad={importResult.errores.length} />
              )}
            </div>
            {importResult.errores.length > 0 && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <p className="font-medium">Filas que no se pudieron importar:</p>
                <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-4">
                  {importResult.errores.map((e, i) => (
                    <li key={i}>
                      {e.linea ? `Línea ${e.linea}: ` : ""}
                      {e.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={importLoading || importText.trim().length === 0}
          className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {importLoading ? "Importando..." : "Importar"}
        </button>
      </form>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ver programa
            </label>
            <select
              value={programaFiltro}
              onChange={(e) => handleProgramaChange(e.target.value as ProgramaFormacionValue | "")}
              className={inputClass}
            >
              <option value="">Selecciona un programa</option>
              {ProgramasFormacionValues.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          {programaFiltro && competencias && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {competencias.length} competencia(s)
            </span>
          )}
        </div>

        {!programaFiltro ? (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Selecciona un programa para ver o editar su catálogo de competencias.
          </p>
        ) : competencias === null ? (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>
        ) : (
          <div className="p-6">
            <div className="mb-3">
              {agregando ? (
                <form
                  onSubmit={handleAgregar}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoCompetenciaValue }))}
                      className={inputClass}
                    >
                      {TipoCompetenciaValues.map((t) => (
                        <option key={t} value={t}>
                          {tipoCompetenciaLabel[t]}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="Código de competencia"
                      value={form.codigoCompetencia}
                      onChange={(e) => setForm((f) => ({ ...f, codigoCompetencia: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <input
                    placeholder="Nombre de la competencia"
                    value={form.nombreCompetencia}
                    onChange={(e) => setForm((f) => ({ ...f, nombreCompetencia: e.target.value }))}
                    className={inputClass}
                  />
                  <textarea
                    placeholder="Resultado de aprendizaje"
                    value={form.resultadoAprendizaje}
                    onChange={(e) => setForm((f) => ({ ...f, resultadoAprendizaje: e.target.value }))}
                    rows={2}
                    className={inputClass}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      placeholder="Horas (opcional)"
                      type="number"
                      value={form.horas}
                      onChange={(e) => setForm((f) => ({ ...f, horas: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      placeholder="Red de conocimiento (opcional)"
                      value={form.redConocimiento}
                      onChange={(e) => setForm((f) => ({ ...f, redConocimiento: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      {formLoading ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAgregando(false);
                        setForm(formVacio);
                        setFormError(null);
                      }}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAgregando(true)}
                  className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  + Agregar competencia
                </button>
              )}
            </div>

            {competencias.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Este programa todavía no tiene competencias cargadas.
              </p>
            ) : (
              <ul className="space-y-2">
                {competencias.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                  >
                    {editingId === c.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <select
                            value={editForm.tipo}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, tipo: e.target.value as TipoCompetenciaValue }))
                            }
                            className={inputClass}
                          >
                            {TipoCompetenciaValues.map((t) => (
                              <option key={t} value={t}>
                                {tipoCompetenciaLabel[t]}
                              </option>
                            ))}
                          </select>
                          <input
                            value={editForm.codigoCompetencia}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, codigoCompetencia: e.target.value }))
                            }
                            className={inputClass}
                          />
                        </div>
                        <input
                          value={editForm.nombreCompetencia}
                          onChange={(e) => setEditForm((f) => ({ ...f, nombreCompetencia: e.target.value }))}
                          className={inputClass}
                        />
                        <textarea
                          value={editForm.resultadoAprendizaje}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, resultadoAprendizaje: e.target.value }))
                          }
                          rows={2}
                          className={inputClass}
                        />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            type="number"
                            value={editForm.horas}
                            onChange={(e) => setEditForm((f) => ({ ...f, horas: e.target.value }))}
                            className={inputClass}
                          />
                          <input
                            value={editForm.redConocimiento}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, redConocimiento: e.target.value }))
                            }
                            className={inputClass}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={editLoading}
                            onClick={() => handleGuardarEdicion(c.id)}
                            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                          >
                            {editLoading ? "Guardando..." : "Guardar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {tipoCompetenciaLabel[c.tipo]} · {c.codigoCompetencia} ·{" "}
                            {c.nombreCompetencia}
                          </p>
                          <p className="text-zinc-900 dark:text-zinc-50">{c.resultadoAprendizaje}</p>
                          {(c.horas || c.redConocimiento) && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {c.horas && `${c.horas} horas`}
                              {c.horas && c.redConocimiento && " · "}
                              {c.redConocimiento}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === c.id}
                            onClick={() => handleEliminar(c.id)}
                            className="text-xs font-medium text-red-600 underline hover:text-red-800 disabled:opacity-50 dark:text-red-500"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
