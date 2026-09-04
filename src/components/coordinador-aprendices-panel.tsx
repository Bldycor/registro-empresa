"use client";

import { useState } from "react";
import { AprendizCreatePanel } from "@/components/aprendiz-create-panel";
import {
  ComunaValues,
  comunaLabel,
  EstadoAprendizValues,
  estadoAprendizLabel,
  AlternativaEtapaProductivaValues,
  alternativaEtapaProductivaLabel,
  type ComunaValue,
  type EstadoAprendizValue,
  type AlternativaEtapaProductivaValue,
} from "@/lib/validations";

type Ficha = { id: string; codigo: string };

type FichaConInstructor = Ficha & {
  instructor: { nombres: string; apellidos: string } | null;
};

type Aprendiz = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  comuna: ComunaValue | null;
  estado: EstadoAprendizValue;
  alternativaEtapaProductiva: AlternativaEtapaProductivaValue | null;
  fichaId: string | null;
  ficha: FichaConInstructor | null;
};

type GestionForm = {
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  comuna: string;
  estado: EstadoAprendizValue;
  alternativaEtapaProductiva: string;
  fichaId: string;
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function gestionVaciaDe(aprendiz: Aprendiz): GestionForm {
  return {
    nombres: aprendiz.nombres,
    apellidos: aprendiz.apellidos,
    cedula: aprendiz.cedula,
    email: aprendiz.email,
    celular: aprendiz.celular,
    direccionResidencia: aprendiz.direccionResidencia,
    comuna: aprendiz.comuna ?? "",
    estado: aprendiz.estado,
    alternativaEtapaProductiva: aprendiz.alternativaEtapaProductiva ?? "",
    fichaId: aprendiz.fichaId ?? "",
  };
}

export function CoordinadorAprendicesPanel({
  initialAprendices,
  fichas,
}: {
  initialAprendices: Aprendiz[];
  fichas: Ficha[];
}) {
  const [aprendices, setAprendices] = useState<Aprendiz[]>(initialAprendices);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [soloSinFicha, setSoloSinFicha] = useState(false);
  const [filtroFichaId, setFiltroFichaId] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"" | EstadoAprendizValue>("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [gestionForm, setGestionForm] = useState<GestionForm | null>(null);
  const [gestionLoading, setGestionLoading] = useState(false);
  const [gestionError, setGestionError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignFichaId, setBulkAssignFichaId] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);
  const [bulkAssignError, setBulkAssignError] = useState<string | null>(null);

  const porCertificarCount = aprendices.filter((a) => a.estado === "POR_CERTIFICAR").length;

  const aprendicesFiltrados = aprendices.filter((a) => {
    if (soloSinFicha && a.fichaId) return false;
    if (!soloSinFicha && filtroFichaId && a.fichaId !== filtroFichaId) return false;
    if (filtroEstado && a.estado !== filtroEstado) return false;
    const texto = filtroTexto.trim().toLowerCase();
    if (texto) {
      const nombreCompleto = `${a.nombres} ${a.apellidos}`.toLowerCase();
      if (!nombreCompleto.includes(texto) && !a.cedula.includes(texto)) return false;
    }
    return true;
  });

  function startEdit(aprendiz: Aprendiz) {
    setEditingId(aprendiz.id);
    setGestionError(null);
    setGestionForm(gestionVaciaDe(aprendiz));
  }

  function cancelEdit() {
    setEditingId(null);
    setGestionForm(null);
    setGestionError(null);
  }

  function updateGestion<K extends keyof GestionForm>(key: K, value: GestionForm[K]) {
    setGestionForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSaveGestion(aprendizId: string) {
    if (!gestionForm) return;
    setGestionLoading(true);
    setGestionError(null);

    const res = await fetch(`/api/coordinador/aprendices/${aprendizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombres: gestionForm.nombres,
        apellidos: gestionForm.apellidos,
        cedula: gestionForm.cedula,
        email: gestionForm.email,
        celular: gestionForm.celular,
        direccionResidencia: gestionForm.direccionResidencia,
        comuna: gestionForm.comuna || null,
        estado: gestionForm.estado,
        alternativaEtapaProductiva: gestionForm.alternativaEtapaProductiva || null,
        fichaId: gestionForm.fichaId || null,
      }),
    });

    const data = await res.json();
    setGestionLoading(false);

    if (!res.ok) {
      const primerError =
        typeof data.error === "string"
          ? data.error
          : Object.values(data.error ?? {})
              .flat()
              .find((m): m is string => typeof m === "string");
      setGestionError(primerError ?? "No se pudieron guardar los cambios.");
      return;
    }

    setAprendices((prev) =>
      prev
        .map((a) => (a.id === aprendizId ? { ...a, ...data.aprendiz } : a))
        .sort((a, b) => a.nombres.localeCompare(b.nombres))
    );
    cancelEdit();
  }

  function askDelete(aprendizId: string) {
    setDeletingId(aprendizId);
    setDeleteError(null);
  }

  function cancelDelete() {
    setDeletingId(null);
    setDeleteError(null);
  }

  async function confirmDelete(aprendizId: string) {
    setDeleteLoading(true);
    setDeleteError(null);

    const res = await fetch(`/api/coordinador/aprendices/${aprendizId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleteLoading(false);

    if (!res.ok) {
      setDeleteError(typeof data.error === "string" ? data.error : "No se pudo eliminar el aprendiz.");
      return;
    }

    setAprendices((prev) => prev.filter((a) => a.id !== aprendizId));
    setDeletingId(null);
  }

  async function refetchAprendices() {
    const res = await fetch("/api/coordinador/aprendices");
    if (res.ok) {
      const data = await res.json();
      setAprendices(data.aprendices ?? []);
    }
  }

  function toggleSelected(aprendizId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(aprendizId)) {
        next.delete(aprendizId);
      } else {
        next.add(aprendizId);
      }
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const idsVisibles = aprendicesFiltrados.map((a) => a.id);
    const todosSeleccionados = idsVisibles.length > 0 && idsVisibles.every((id) => selectedIds.has(id));
    setSelectedIds(todosSeleccionados ? new Set() : new Set(idsVisibles));
  }

  async function handleBulkAssignFicha() {
    setBulkAssignLoading(true);
    setBulkAssignError(null);

    const res = await fetch("/api/coordinador/aprendices/asignar-ficha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aprendizIds: Array.from(selectedIds),
        fichaId: bulkAssignFichaId || null,
      }),
    });

    const data = await res.json();
    setBulkAssignLoading(false);

    if (!res.ok) {
      setBulkAssignError(data.error ?? "No se pudo asignar la ficha.");
      return;
    }

    setSelectedIds(new Set());
    setBulkAssignFichaId("");
    await refetchAprendices();
  }

  return (
    <div className="w-full max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Aprendices
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todos los aprendices registrados, tengan o no ficha asignada. Edita sus datos, cambia
          su estado, o reasigna/desasigna su ficha.
        </p>
      </div>

      <AprendizCreatePanel
        fichas={fichas}
        createUrl="/api/coordinador/aprendices/create"
        importUrl="/api/coordinador/aprendices/import"
        sinFichasMensaje="No hay fichas registradas todavía — precárgalas primero en Fichas."
        restriccionFichaTexto="la ficha no existe"
        onCreated={refetchAprendices}
      />

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
                value={filtroFichaId}
                onChange={(e) => {
                  setFiltroFichaId(e.target.value);
                  if (e.target.value) setSoloSinFicha(false);
                }}
                disabled={soloSinFicha}
                className={`${inputClass} text-xs disabled:opacity-50`}
              >
                <option value="">Todas las fichas</option>
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.codigo}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={soloSinFicha}
                  onChange={(e) => {
                    setSoloSinFicha(e.target.checked);
                    if (e.target.checked) setFiltroFichaId("");
                  }}
                />
                Sin ficha asignada
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as "" | EstadoAprendizValue)}
                className={`${inputClass} text-xs`}
              >
                <option value="">Todos los estados</option>
                {EstadoAprendizValues.map((v) => (
                  <option key={v} value={v}>
                    {estadoAprendizLabel[v]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {porCertificarCount > 0 && filtroEstado !== "POR_CERTIFICAR" && (
            <button
              type="button"
              onClick={() => setFiltroEstado("POR_CERTIFICAR")}
              className="flex w-fit items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
            >
              ✓ {porCertificarCount} aprendiz{porCertificarCount === 1 ? "" : "es"} por certificar — ver
            </button>
          )}

          {aprendicesFiltrados.length > 0 &&
            (() => {
              const todosVisiblesSeleccionados = aprendicesFiltrados.every((a) => selectedIds.has(a.id));
              return (
                <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={todosVisiblesSeleccionados}
                    onChange={toggleSelectAllVisible}
                  />
                  {todosVisiblesSeleccionados
                    ? "Deseleccionar todos los visibles"
                    : "Seleccionar todos los visibles"}
                </label>
              );
            })()}

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-950/40">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {selectedIds.size} aprendiz(es) seleccionado(s)
              </span>
              <select
                value={bulkAssignFichaId}
                onChange={(e) => setBulkAssignFichaId(e.target.value)}
                className={`${inputClass} text-xs`}
              >
                <option value="">Sin ficha asignada</option>
                {fichas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.codigo}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkAssignFicha}
                disabled={bulkAssignLoading}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {bulkAssignLoading ? "Asignando..." : "Asignar a seleccionados"}
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

        {aprendices.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no hay aprendices registrados.
          </p>
        ) : aprendicesFiltrados.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
            Ningún aprendiz coincide con el filtro.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {aprendicesFiltrados.map((aprendiz) => {
              const isEditing = editingId === aprendiz.id;
              const isDeleting = deletingId === aprendiz.id;

              return (
                <li key={aprendiz.id}>
                  <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(aprendiz.id)}
                        onChange={() => toggleSelected(aprendiz.id)}
                        className="mt-1"
                        aria-label={`Seleccionar ${aprendiz.nombres} ${aprendiz.apellidos}`}
                      />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {aprendiz.nombres} {aprendiz.apellidos}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {aprendiz.email} · Cédula: {aprendiz.cedula}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <div className="flex flex-wrap items-center gap-1">
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
                        {aprendiz.ficha ? (
                          <>
                            <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                              Ficha: {aprendiz.ficha.codigo}
                            </span>
                            {aprendiz.ficha.instructor ? (
                              <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                                Instructor: {aprendiz.ficha.instructor.nombres}{" "}
                                {aprendiz.ficha.instructor.apellidos}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                Ficha sin instructor
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            Sin ficha asignada
                          </span>
                        )}
                        {aprendiz.alternativaEtapaProductiva && (
                          <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                            {alternativaEtapaProductivaLabel[aprendiz.alternativaEtapaProductiva]}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex gap-3">
                        <button
                          type="button"
                          onClick={() => (isEditing ? cancelEdit() : startEdit(aprendiz))}
                          className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          {isEditing ? "Cancelar" : "Editar datos"}
                        </button>
                        <button
                          type="button"
                          onClick={() => askDelete(aprendiz.id)}
                          className="text-xs font-medium text-red-600 underline hover:text-red-800 dark:text-red-500 dark:hover:text-red-400"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>

                  {isEditing && gestionForm && (
                    <div className="space-y-3 bg-zinc-50 px-6 pb-4 pt-2 dark:bg-zinc-950/40">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Nombres
                          <input
                            value={gestionForm.nombres}
                            onChange={(e) => updateGestion("nombres", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Apellidos
                          <input
                            value={gestionForm.apellidos}
                            onChange={(e) => updateGestion("apellidos", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Cédula
                          <input
                            value={gestionForm.cedula}
                            onChange={(e) => updateGestion("cedula", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Correo electrónico
                          <input
                            type="email"
                            value={gestionForm.email}
                            onChange={(e) => updateGestion("email", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Celular
                          <input
                            value={gestionForm.celular}
                            onChange={(e) => updateGestion("celular", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Dirección de residencia
                          <input
                            value={gestionForm.direccionResidencia}
                            onChange={(e) => updateGestion("direccionResidencia", e.target.value)}
                            className={inputClass}
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Comuna
                          <select
                            value={gestionForm.comuna}
                            onChange={(e) => updateGestion("comuna", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Sin definir</option>
                            {ComunaValues.map((v) => (
                              <option key={v} value={v}>
                                {comunaLabel[v]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Estado
                          <select
                            value={gestionForm.estado}
                            onChange={(e) => updateGestion("estado", e.target.value as EstadoAprendizValue)}
                            className={inputClass}
                          >
                            {EstadoAprendizValues.map((v) => (
                              <option key={v} value={v}>
                                {estadoAprendizLabel[v]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Ficha
                          <select
                            value={gestionForm.fichaId}
                            onChange={(e) => updateGestion("fichaId", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Sin ficha asignada</option>
                            {fichas.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.codigo}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Alternativa de Etapa Productiva
                          <select
                            value={gestionForm.alternativaEtapaProductiva}
                            onChange={(e) => updateGestion("alternativaEtapaProductiva", e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Sin definir</option>
                            {AlternativaEtapaProductivaValues.map((v) => (
                              <option key={v} value={v}>
                                {alternativaEtapaProductivaLabel[v]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {gestionError && <p className="text-sm text-red-600">{gestionError}</p>}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveGestion(aprendiz.id)}
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

                  {isDeleting && (
                    <div className="space-y-3 border-y border-red-200 bg-red-50 px-6 py-4 dark:border-red-900 dark:bg-red-950/30">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        ¿Eliminar la cuenta de {aprendiz.nombres} {aprendiz.apellidos}? Esta
                        acción no se puede deshacer.
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-400">
                        Se borra su cuenta y <strong>todo lo asociado a su Etapa Productiva</strong>:
                        perfil de empresa, concertación, evaluaciones y bitácoras. A diferencia de
                        eliminar una ficha o un instructor, acá sí se pierde el historial completo
                        del aprendiz.
                      </p>
                      {deleteError && (
                        <p className="text-sm text-red-800 dark:text-red-300">{deleteError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => confirmDelete(aprendiz.id)}
                          disabled={deleteLoading}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleteLoading ? "Eliminando..." : "Sí, eliminar aprendiz"}
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
