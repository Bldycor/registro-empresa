"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import { PlazoBadge } from "@/components/plazo-badge";
import {
  PLAZO_AVAL_ALTERNATIVA_HABILES,
  PLAZO_CAMBIO_ALTERNATIVA_HABILES,
  PLAZO_REGISTRO_SOFIAPLUS_HABILES,
  fechaEnColombia,
} from "@/lib/plazos-institucionales";
import {
  alternativaEtapaProductivaLabel,
  subtipoAlternativaEtapaProductivaLabel,
  tipoSolicitudAlternativaLabel,
  type AlternativaEtapaProductivaValue,
  type SubtipoAlternativaEtapaProductivaValue,
  type TipoSolicitudAlternativaValue,
} from "@/lib/validations";

type Seleccion = {
  id: string;
  tipoSolicitud: TipoSolicitudAlternativaValue;
  fechaSolicitud: string;
  alternativa: AlternativaEtapaProductivaValue;
  subtipoAlternativa: SubtipoAlternativaEtapaProductivaValue | null;
  fechaInicioEjecucion: string | null;
  fechaFinEjecucion: string | null;
  archivoUrl: string | null;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  observacionesAval: string | null;
  // Solo los devuelve el listado de Coordinación (el del instructor no los necesita).
  fechaAval?: string | null;
  registroSofiaPlus?: string | null;
  // Plazo de 24 meses del Acuerdo 007 de 2012, en las solicitudes por avalar (solo advierte).
  advertenciaPlazo?: string | null;
  createdAt: string;
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    ficha: {
      codigo: string;
      programa: string | null;
      instructor: { nombres: string; apellidos: string } | null;
    } | null;
  };
};

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

// Mismo "hoy" que usa el servidor para validar, sin depender de la zona horaria del navegador.
function hoyColombia(): string {
  return fechaEnColombia(new Date());
}

export function AlternativasEPPanel({
  listUrl = "/api/coordinador/alternativas",
  patchUrlBase = "/api/coordinador/alternativas",
  // El registro en SofiaPlus (guía GFPI-G-040 §9.1.2) lo hace Coordinación. El instructor usa este
  // mismo panel para revisar, pero no ve ni anota esa constancia.
  permiteRegistroSofiaPlus = false,
}: {
  listUrl?: string;
  patchUrlBase?: string;
  permiteRegistroSofiaPlus?: boolean;
} = {}) {
  const [selecciones, setSelecciones] = useState<Seleccion[] | null>(null);
  const [filtro, setFiltro] = useState<"TODAS" | "PENDIENTE" | "APROBADA" | "RECHAZADA" | "SIN_SOFIAPLUS">(
    "PENDIENTE",
  );
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroPrograma, setFiltroPrograma] = useState("");
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  // Constancia de por qué se avala pese a requisitos de §9.1.1 sin resolver. El campo solo
  // aparece cuando el servidor devuelve cuáles faltan, para no pedirlo de entrada.
  const [constancia, setConstancia] = useState<Record<string, string>>({});
  const [requisitosFaltantes, setRequisitosFaltantes] = useState<
    Record<string, { etiqueta: string; detalle: string }[]>
  >({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [fechaSofia, setFechaSofia] = useState<Record<string, string>>({});

  function load() {
    fetch(listUrl)
      .then((res) => res.json())
      .then((data) => setSelecciones(data.selecciones ?? []));
  }

  useEffect(load, [listUrl]);

  async function avalar(id: string, estado: "APROBADA" | "RECHAZADA") {
    setBusy(id);
    setErrores((prev) => ({ ...prev, [id]: "" }));

    const res = await fetch(`${patchUrlBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estado,
        observacionesAval: observaciones[id] ?? null,
        requisitosOmitidos: constancia[id] ?? null,
      }),
    });
    setBusy(null);

    if (!res.ok) {
      const data = await res.json();
      if (data.requisitosPendientes) {
        setRequisitosFaltantes((prev) => ({ ...prev, [id]: data.requisitosPendientes }));
      }
      const msg =
        typeof data.error === "string"
          ? data.error
          : Object.values(data.error ?? {})
              .flat()
              .join(" ") || "No se pudo guardar.";
      setErrores((prev) => ({ ...prev, [id]: msg }));
      return;
    }

    setRequisitosFaltantes((prev) => ({ ...prev, [id]: [] }));
    load();
  }

  async function registrarSofiaPlus(id: string, valor: string | null) {
    setBusy(id);
    setErrores((prev) => ({ ...prev, [id]: "" }));

    const res = await fetch(`${patchUrlBase}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registroSofiaPlus: valor }),
    });
    setBusy(null);

    if (!res.ok) {
      const data = await res.json();
      const msg =
        typeof data.error === "string"
          ? data.error
          : Object.values(data.error ?? {})
              .flat()
              .join(" ") || "No se pudo guardar.";
      setErrores((prev) => ({ ...prev, [id]: msg }));
      return;
    }
    load();
  }

  if (selecciones === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const contadores = {
    PENDIENTE: selecciones.filter((s) => s.estado === "PENDIENTE").length,
    APROBADA: selecciones.filter((s) => s.estado === "APROBADA").length,
    RECHAZADA: selecciones.filter((s) => s.estado === "RECHAZADA").length,
    SIN_SOFIAPLUS: selecciones.filter((s) => s.estado === "APROBADA" && !s.registroSofiaPlus)
      .length,
  };

  const programasDisponibles = Array.from(
    new Set(selecciones.map((s) => s.user.ficha?.programa).filter((p): p is string => Boolean(p)))
  ).sort((a, b) => a.localeCompare(b));

  const visibles = selecciones.filter((s) => {
    if (filtro === "SIN_SOFIAPLUS") {
      if (s.estado !== "APROBADA" || s.registroSofiaPlus) return false;
    } else if (filtro !== "TODAS" && s.estado !== filtro) return false;
    if (filtroPrograma && s.user.ficha?.programa !== filtroPrograma) return false;
    const texto = filtroTexto.trim().toLowerCase();
    if (texto) {
      const nombreCompleto = `${s.user.nombres} ${s.user.apellidos}`.toLowerCase();
      if (!nombreCompleto.includes(texto) && !s.user.cedula.includes(texto)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="ambar" etiqueta="pendientes" cantidad={contadores.PENDIENTE} />
        <StatBadge tono="verde" etiqueta="aprobadas" cantidad={contadores.APROBADA} />
        <StatBadge tono="rojo" etiqueta="rechazadas" cantidad={contadores.RECHAZADA} />
        {permiteRegistroSofiaPlus && contadores.SIN_SOFIAPLUS > 0 && (
          <StatBadge
            tono="azul"
            etiqueta="sin registrar en SofiaPlus"
            cantidad={contadores.SIN_SOFIAPLUS}
          />
        )}

        <input
          type="text"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          placeholder="Buscar por aprendiz o cédula"
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-sm w-48 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <select
          value={filtroPrograma}
          onChange={(e) => setFiltroPrograma(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">Todos los programas</option>
          {programasDisponibles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="PENDIENTE">Pendientes</option>
          <option value="APROBADA">Aprobadas</option>
          <option value="RECHAZADA">Rechazadas</option>
          {permiteRegistroSofiaPlus && (
            <option value="SIN_SOFIAPLUS">Sin registrar en SofiaPlus</option>
          )}
          <option value="TODAS">Todas</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay solicitudes en este filtro.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {s.user.nombres} {s.user.apellidos}{" "}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
                      · CC {s.user.cedula} · Ficha {s.user.ficha?.codigo ?? "sin asignar"}
                      {s.user.ficha?.programa && <> · {s.user.ficha.programa}</>}
                      {" · Instructor "}
                      {s.user.ficha?.instructor
                        ? `${s.user.ficha.instructor.nombres} ${s.user.ficha.instructor.apellidos}`
                        : "sin asignar"}
                    </span>
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {tipoSolicitudAlternativaLabel[s.tipoSolicitud]} →{" "}
                    {alternativaEtapaProductivaLabel[s.alternativa]}
                    {s.subtipoAlternativa && (
                      <> ({subtipoAlternativaEtapaProductivaLabel[s.subtipoAlternativa]})</>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ejecución:{" "}
                    {s.fechaInicioEjecucion
                      ? new Date(s.fechaInicioEjecucion).toLocaleDateString("es-CO", {
                          timeZone: "UTC",
                        })
                      : "—"}{" "}
                    →{" "}
                    {s.fechaFinEjecucion
                      ? new Date(s.fechaFinEjecucion).toLocaleDateString("es-CO", {
                          timeZone: "UTC",
                        })
                      : "—"}
                  </p>
                  {s.advertenciaPlazo && (
                    <p className="mt-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      {s.advertenciaPlazo} Puedes avalarla igual.
                    </p>
                  )}
                  {s.archivoUrl && (
                    <a
                      href={s.archivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-700 underline dark:text-emerald-500"
                    >
                      Ver documento adjunto
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {s.estado === "PENDIENTE" && (
                    <PlazoBadge
                      desde={s.createdAt}
                      limite={
                        s.tipoSolicitud === "MODIFICACION"
                          ? PLAZO_CAMBIO_ALTERNATIVA_HABILES
                          : PLAZO_AVAL_ALTERNATIVA_HABILES
                      }
                    />
                  )}
                  {permiteRegistroSofiaPlus && s.estado === "APROBADA" && !s.registroSofiaPlus && (
                    <PlazoBadge
                      desde={s.fechaAval ?? null}
                      limite={PLAZO_REGISTRO_SOFIAPLUS_HABILES}
                    />
                  )}
                  <EstadoBadge estado={s.estado} />
                </div>
              </div>

              {s.estado === "PENDIENTE" && (
                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <textarea
                    placeholder="Observaciones (opcional)"
                    value={observaciones[s.id] ?? ""}
                    onChange={(e) =>
                      setObservaciones((prev) => ({ ...prev, [s.id]: e.target.value }))
                    }
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    rows={2}
                  />
                  {(requisitosFaltantes[s.id]?.length ?? 0) > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                      <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                        Requisitos sin resolver (guía GFPI-G-040 §9.1.1):
                      </p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-amber-800 dark:text-amber-400">
                        {requisitosFaltantes[s.id].map((r) => (
                          <li key={r.etiqueta}>
                            <strong>{r.etiqueta}:</strong> {r.detalle}
                          </li>
                        ))}
                      </ul>
                      <textarea
                        placeholder="Razón por la que avalas de todas formas (queda como constancia)"
                        value={constancia[s.id] ?? ""}
                        onChange={(e) =>
                          setConstancia((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        className="mt-2 w-full rounded-md border border-amber-300 px-3 py-2 text-sm dark:border-amber-800 dark:bg-zinc-950"
                        rows={2}
                      />
                    </div>
                  )}

                  {errores[s.id] && <p className="text-xs text-red-600">{errores[s.id]}</p>}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={() => avalar(s.id, "APROBADA")}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Avalar
                    </button>
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={() => avalar(s.id, "RECHAZADA")}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              )}

              {permiteRegistroSofiaPlus && s.estado === "APROBADA" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
                  {s.registroSofiaPlus ? (
                    <>
                      <span className="text-emerald-700 dark:text-emerald-500">
                        ✓ Registrado en SofiaPlus el {formatoFecha(s.registroSofiaPlus)}
                      </span>
                      <button
                        type="button"
                        disabled={busy === s.id}
                        onClick={() => registrarSofiaPlus(s.id, null)}
                        className="font-medium text-zinc-500 underline hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        Deshacer
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Fecha de registro en SofiaPlus:
                      </span>
                      <input
                        type="date"
                        value={fechaSofia[s.id] ?? hoyColombia()}
                        max={hoyColombia()}
                        min={s.fechaAval ? fechaEnColombia(new Date(s.fechaAval)) : undefined}
                        onChange={(e) =>
                          setFechaSofia((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <button
                        type="button"
                        disabled={busy === s.id}
                        onClick={() => registrarSofiaPlus(s.id, fechaSofia[s.id] ?? hoyColombia())}
                        className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        Registrar
                      </button>
                    </>
                  )}
                  {errores[s.id] && <p className="w-full text-xs text-red-600">{errores[s.id]}</p>}
                </div>
              )}

              {s.observacionesAval && s.estado !== "PENDIENTE" && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Observaciones: {s.observacionesAval}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
    APROBADA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
    RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  };
  const text: Record<string, string> = {
    PENDIENTE: "Pendiente",
    APROBADA: "Aprobada",
    RECHAZADA: "Rechazada",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[estado] ?? ""}`}>
      {text[estado] ?? estado}
    </span>
  );
}
