"use client";

import { useState } from "react";
import {
  EstadoFichaValues,
  estadoFichaLabel,
  NivelFormacionValues,
  nivelFormacionLabel,
  JornadaValues,
  jornadaLabel,
  ProgramasFormacionValues,
  estadoAprendizLabel,
  type EstadoFichaValue,
  type NivelFormacionValue,
  type JornadaValue,
  type EstadoAprendizValue,
} from "@/lib/validations";
import { StatBadge } from "@/components/stat-badge";
import { DatePickerField } from "@/components/date-picker-field";

type Instructor = { id: string; nombres: string; apellidos: string; email: string };

type Aprendiz = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  estado: EstadoAprendizValue;
};

type Ficha = {
  id: string;
  codigo: string;
  programa: string | null;
  estado: EstadoFichaValue | null;
  nivelFormacion: NivelFormacionValue | null;
  jornada: JornadaValue | null;
  fechaInicioFicha: string | null;
  fechaInicioProductiva: string | null;
  fechaFinFormacion: string | null;
  fechaLimiteIniciarEP: string | null;
  instructorId: string | null;
  instructor: Instructor | null;
  _count: { aprendices: number };
  aprendices: Aprendiz[];
};

// Inicio productiva y Límite iniciar EP no están acá: se calculan siempre en el servidor con la
// fórmula oficial (ver src/lib/ficha-fechas.ts) a partir del nivel de formación y estas dos
// fechas, no se editan directamente.
type GestionForm = {
  programa: string;
  estado: string;
  nivelFormacion: string;
  jornada: string;
  fechaInicioFicha: string;
  fechaFinFormacion: string;
};

const gestionVacia: GestionForm = {
  programa: "",
  estado: "",
  nivelFormacion: "",
  jornada: "",
  fechaInicioFicha: "",
  fechaFinFormacion: "",
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function aInputDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function formatoLegible(iso: string | null): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  // Las fechas de ficha son solo calendario (se guardan a medianoche UTC); formatear en la zona
  // horaria local del navegador correría el riesgo de mostrar el día anterior (p. ej. Colombia,
  // UTC-5). Se formatea explícitamente en UTC para que coincida siempre con lo guardado.
  return fecha.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [gestionForm, setGestionForm] = useState<GestionForm>(gestionVacia);
  const [gestionLoading, setGestionLoading] = useState(false);
  const [gestionError, setGestionError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    creadas: string[];
    incompletas: string[];
    yaExistian: string[];
    errores: { motivo: string }[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [soloSinInstructor, setSoloSinInstructor] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignInstructorId, setBulkAssignInstructorId] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
  const [bulkAssignError, setBulkAssignError] = useState<string | null>(null);

  const fichasFiltradas = fichas.filter((ficha) => {
    if (soloSinInstructor && ficha.instructorId) return false;
    if (filtroTexto.trim() && !ficha.codigo.includes(filtroTexto.trim())) return false;
    return true;
  });

  function toggleSelected(fichaId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fichaId)) {
        next.delete(fichaId);
      } else {
        next.add(fichaId);
      }
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const idsVisibles = fichasFiltradas.map((f) => f.id);
    const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every((id) => selectedIds.has(id));
    setSelectedIds(todasSeleccionadas ? new Set() : new Set(idsVisibles));
  }

  async function handleBulkAssignInstructor() {
    setBulkAssignLoading(true);
    setBulkAssignError(null);

    const res = await fetch("/api/coordinador/fichas/asignar-instructor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fichaIds: Array.from(selectedIds),
        instructorId: bulkAssignInstructorId || null,
      }),
    });

    const data = await res.json();
    setBulkAssignLoading(false);

    if (!res.ok) {
      setBulkAssignError(data.error ?? "No se pudo asignar el instructor.");
      return;
    }

    setSelectedIds(new Set());
    setBulkAssignInstructorId("");
    await refetchFichas();
  }

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

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    const res = await fetch("/api/coordinador/fichas/import", {
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

  function startEdit(ficha: Ficha) {
    setEditingId(ficha.id);
    setGestionError(null);
    setGestionForm({
      programa: ficha.programa ?? "",
      estado: ficha.estado ?? "",
      nivelFormacion: ficha.nivelFormacion ?? "",
      jornada: ficha.jornada ?? "",
      fechaInicioFicha: aInputDate(ficha.fechaInicioFicha),
      fechaFinFormacion: aInputDate(ficha.fechaFinFormacion),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setGestionForm(gestionVacia);
    setGestionError(null);
  }

  function updateGestion<K extends keyof GestionForm>(key: K, value: GestionForm[K]) {
    setGestionForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveGestion(fichaId: string) {
    setGestionLoading(true);
    setGestionError(null);

    const res = await fetch(`/api/coordinador/fichas/${fichaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gestion: {
          programa: gestionForm.programa || null,
          estado: gestionForm.estado || null,
          nivelFormacion: gestionForm.nivelFormacion || null,
          jornada: gestionForm.jornada || null,
          fechaInicioFicha: gestionForm.fechaInicioFicha || null,
          fechaFinFormacion: gestionForm.fechaFinFormacion || null,
        },
      }),
    });

    const data = await res.json();
    setGestionLoading(false);

    if (!res.ok) {
      setGestionError(
        typeof data.error === "string" ? data.error : "No se pudieron guardar los cambios."
      );
      return;
    }

    setFichas((prev) => prev.map((f) => (f.id === fichaId ? { ...f, ...data.ficha } : f)));
    cancelEdit();
  }

  function askDelete(fichaId: string) {
    setDeletingId(fichaId);
    setDeleteError(null);
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeleteError(null);
  }

  async function confirmDelete(fichaId: string) {
    setDeleteLoading(true);
    setDeleteError(null);

    const res = await fetch(`/api/coordinador/fichas/${fichaId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleteLoading(false);

    if (!res.ok) {
      setDeleteError(
        typeof data.error === "string" ? data.error : "No se pudo eliminar la ficha."
      );
      return;
    }

    setFichas((prev) => prev.filter((f) => f.id !== fichaId));
    setSelectedIds((prev) => {
      if (!prev.has(fichaId)) return prev;
      const next = new Set(prev);
      next.delete(fichaId);
      return next;
    });
    setDeletingId(null);
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

      <form
        onSubmit={handleImportSubmit}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Importar desde hoja de cálculo
        </label>
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          Selecciona en la hoja de control las columnas <strong>FICHA</strong>,{" "}
          <strong>PROGRAMA DE FORMACIÓN</strong>, <strong>ESTADO</strong>,{" "}
          <strong>NIVEL DE FORMACIÓN</strong>, <strong>JORNADA</strong>,{" "}
          <strong>INICIO FICHA</strong> y <strong>FIN DE FORMACIÓN</strong> (incluir el
          encabezado ayuda, pero no es obligatorio), copia y pega aquí. El valor de{" "}
          <strong>PROGRAMA DE FORMACIÓN</strong> debe coincidir exactamente con uno de los
          programas del catálogo oficial; si no coincide, esa fila queda reportada como error.
          Solo se crean fichas nuevas — si un código ya existe en el sistema, no se modifica;
          queda listado como &quot;ya existía&quot; para que lo revises tú.
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
              <StatBadge tono="verde" etiqueta="Creadas" cantidad={importResult.creadas.length} />
              <StatBadge
                tono="ambar"
                etiqueta="Ya existían (sin modificar)"
                cantidad={importResult.yaExistian.length}
              />
              {importResult.errores.length > 0 && (
                <StatBadge tono="rojo" etiqueta="Con errores" cantidad={importResult.errores.length} />
              )}
              {importResult.incompletas.length > 0 && (
                <StatBadge
                  tono="ambar"
                  etiqueta="Creadas sin programa o sin fechas"
                  cantidad={importResult.incompletas.length}
                />
              )}
            </div>

            {importResult.yaExistian.length > 0 && (
              <details className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <summary className="cursor-pointer font-medium">
                  Ver los {importResult.yaExistian.length} código(s) que ya existían
                </summary>
                <p className="mt-2 font-mono break-words">{importResult.yaExistian.join(", ")}</p>
              </details>
            )}

            {importResult.incompletas.length > 0 && (
              <details
                open
                className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
              >
                <summary className="cursor-pointer font-medium">
                  {importResult.incompletas.length} ficha(s) creada(s) sin{" "}
                  <strong>PROGRAMA</strong> o sin fechas — revísalas
                </summary>
                <p className="mt-2">
                  El texto pegado no traía esas columnas para estas filas. Edítalas manualmente o
                  vuelve a importar incluyendo <strong>PROGRAMA DE FORMACIÓN</strong>,{" "}
                  <strong>INICIO FICHA</strong> y <strong>FIN DE FORMACIÓN</strong> (la
                  importación no pisa fichas existentes, así que tendrás que editarlas una por
                  una o eliminarlas y reimportar).
                </p>
                <p className="mt-2 font-mono break-words">{importResult.incompletas.join(", ")}</p>
              </details>
            )}

            {importResult.errores.length > 0 && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <p className="font-medium">Filas que no se pudieron importar:</p>
                <ul className="mt-1 list-disc pl-4">
                  {importResult.errores.map((e, i) => (
                    <li key={i}>{e.motivo}</li>
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
        <div className="space-y-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {fichasFiltradas.length} de {fichas.length} ficha(s)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar por código"
                className={`${inputClass} w-40`}
              />
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={soloSinInstructor}
                  onChange={(e) => setSoloSinInstructor(e.target.checked)}
                />
                Sin instructor asignado
              </label>
            </div>
          </div>

          {fichasFiltradas.length > 0 &&
            (() => {
              const todasVisiblesSeleccionadas = fichasFiltradas.every((f) => selectedIds.has(f.id));
              return (
                <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={todasVisiblesSeleccionadas}
                    onChange={toggleSelectAllVisible}
                  />
                  {todasVisiblesSeleccionadas
                    ? "Deseleccionar todas las visibles"
                    : "Seleccionar todas las visibles"}
                </label>
              );
            })()}

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-950/40">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {selectedIds.size} ficha(s) seleccionada(s)
              </span>
              <select
                value={bulkAssignInstructorId}
                onChange={(e) => setBulkAssignInstructorId(e.target.value)}
                className={`${inputClass} text-xs`}
              >
                <option value="">Sin instructor asignado</option>
                {instructores.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.nombres} {instructor.apellidos}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkAssignInstructor}
                disabled={bulkAssignLoading}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {bulkAssignLoading ? "Asignando..." : "Asignar a seleccionadas"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Cancelar selección
              </button>
              {bulkAssignError && <p className="w-full text-xs text-red-600">{bulkAssignError}</p>}
            </div>
          )}
        </div>
        {fichas.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no hay fichas cargadas.
          </p>
        ) : fichasFiltradas.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Ninguna ficha coincide con el filtro.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {fichasFiltradas.map((ficha) => {
              const isExpanded = expandedIds.has(ficha.id);
              const tieneAprendices = ficha._count.aprendices > 0;
              const isEditing = editingId === ficha.id;
              const isDeleting = deletingId === ficha.id;

              const resumen = [
                ficha.estado ? estadoFichaLabel[ficha.estado] : null,
                ficha.nivelFormacion ? nivelFormacionLabel[ficha.nivelFormacion] : null,
                ficha.jornada ? jornadaLabel[ficha.jornada] : null,
              ].filter(Boolean);

              const fechas = [
                ["Inicio ficha", formatoLegible(ficha.fechaInicioFicha)],
                ["Inicio productiva", formatoLegible(ficha.fechaInicioProductiva)],
                ["Fin formación", formatoLegible(ficha.fechaFinFormacion)],
                ["Límite iniciar EP", formatoLegible(ficha.fechaLimiteIniciarEP)],
              ].filter(([, valor]) => valor) as [string, string][];

              return (
                <li key={ficha.id}>
                  <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-1 items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ficha.id)}
                        onChange={() => toggleSelected(ficha.id)}
                        className="mt-1.5"
                        aria-label={`Seleccionar ficha ${ficha.codigo}`}
                      />
                      <div className="flex-1">
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

                      <p className="mt-1 pl-6 text-xs text-zinc-500 dark:text-zinc-400">
                        <strong className="uppercase text-zinc-600 dark:text-zinc-300">
                          Programa
                        </strong>
                        : {ficha.programa || "sin especificar"}
                      </p>

                      {(resumen.length > 0 || fechas.length > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1 pl-6">
                          {resumen.map((valor) => (
                            <span
                              key={valor}
                              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              {valor}
                            </span>
                          ))}
                          {fechas.map(([label, valor]) => (
                            <span
                              key={label}
                              className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                            >
                              {label}: {valor}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="ml-6 mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => (isEditing ? cancelEdit() : startEdit(ficha))}
                          className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          {isEditing ? "Cancelar" : "Editar datos"}
                        </button>
                        <button
                          type="button"
                          onClick={() => askDelete(ficha.id)}
                          className="text-xs font-medium text-red-600 underline hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
                        >
                          Eliminar ficha
                        </button>
                      </div>
                      </div>
                    </div>

                    <select
                      value={ficha.instructorId ?? ""}
                      onChange={(e) => handleAssign(ficha.id, e.target.value)}
                      disabled={assigningId === ficha.id}
                      className={inputClass}
                    >
                      <option value="">Sin instructor asignado</option>
                      {instructores.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.nombres} {instructor.apellidos}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isDeleting && (
                    <div className="space-y-3 border-y border-red-200 bg-red-50 px-6 py-4 dark:border-red-900 dark:bg-red-950/30">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        ¿Eliminar la ficha {ficha.codigo}? Esta acción no se puede deshacer.
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400">
                        Se borra la ficha y todos sus datos (estado, fechas, instructor
                        asignado).
                        {tieneAprendices && (
                          <>
                            {" "}
                            Tiene {ficha._count.aprendices} aprendiz(es) asociado(s): sus cuentas{" "}
                            <strong>no se eliminan</strong>, solo quedan sin ficha asignada.
                          </>
                        )}
                      </p>
                      {deleteError && <p className="text-sm text-red-800 dark:text-red-300">{deleteError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => confirmDelete(ficha.id)}
                          disabled={deleteLoading}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleteLoading ? "Eliminando..." : "Sí, eliminar ficha"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelDelete}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="space-y-3 bg-zinc-50 px-6 pb-4 pt-2 dark:bg-zinc-950/40">
                      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Programa de formación
                        <select
                          value={gestionForm.programa}
                          onChange={(e) => updateGestion("programa", e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Sin definir</option>
                          {ProgramasFormacionValues.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Estado
                          <select
                            value={gestionForm.estado}
                            onChange={(e) => updateGestion("estado", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Sin definir</option>
                            {EstadoFichaValues.map((v) => (
                              <option key={v} value={v}>
                                {estadoFichaLabel[v]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Nivel de formación
                          <select
                            value={gestionForm.nivelFormacion}
                            onChange={(e) => updateGestion("nivelFormacion", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Sin definir</option>
                            {NivelFormacionValues.map((v) => (
                              <option key={v} value={v}>
                                {nivelFormacionLabel[v]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Jornada
                          <select
                            value={gestionForm.jornada}
                            onChange={(e) => updateGestion("jornada", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Sin definir</option>
                            {JornadaValues.map((v) => (
                              <option key={v} value={v}>
                                {jornadaLabel[v]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <DatePickerField
                          label="Inicio ficha"
                          value={gestionForm.fechaInicioFicha}
                          onChange={(v) => updateGestion("fechaInicioFicha", v)}
                          labelClassName="text-xs text-zinc-600 dark:text-zinc-400"
                        />
                        <DatePickerField
                          label="Fin formación"
                          value={gestionForm.fechaFinFormacion}
                          onChange={(v) => updateGestion("fechaFinFormacion", v)}
                          labelClassName="text-xs text-zinc-600 dark:text-zinc-400"
                        />
                      </div>

                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Inicio productiva y Límite para iniciar EP se calculan automáticamente a
                        partir de estas fechas y el nivel de formación (no se editan directamente).
                      </p>

                      {gestionError && <p className="text-sm text-red-600">{gestionError}</p>}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveGestion(ficha.id)}
                          disabled={gestionLoading}
                          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          {gestionLoading ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

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
                                  : aprendiz.estado === "POR_CERTIFICAR"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}
                            >
                              {estadoAprendizLabel[aprendiz.estado]}
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
