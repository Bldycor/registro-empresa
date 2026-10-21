"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatBadge } from "@/components/stat-badge";
import type { EstadoCupoBitacora } from "@/lib/seguimiento-evidencias";
import { PlazoBadge } from "@/components/plazo-badge";
import { formatoMomento } from "@/lib/plazos-institucionales";
import { nivelRiesgoARLLabel, type NivelRiesgoARLValue } from "@/lib/validations";

type Bitacora = {
  id: string;
  numero: number;
  periodoDesde: string | null;
  periodoHasta: string | null;
  fechaLimite: string;
  fechaEntrega: string | null;
  archivoUrl: string | null;
  arlAfiliado: boolean | null;
  arlNivelRiesgo: NivelRiesgoARLValue | null;
  arlRiesgoCorresponde: boolean | null;
  arlTieneEPP: boolean | null;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  observaciones: string | null;
  actividades: { descripcion: string; competencias: string | null; evidenciaCumplimiento: string | null }[];
  user: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    ficha: { codigo: string; programa: string | null } | null;
  };
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950";

function siNo(v: boolean | null): string {
  return v === true ? "Sí" : v === false ? "No" : "Sin definir";
}

function formatoFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

// `aprendizId` llega del chip de Bitácoras en Seguimiento: la pantalla se centra en ese aprendiz,
// con su plan de bitácoras arriba (también las que no ha enviado) y abajo solo las suyas.
export function BitacorasPanel({ aprendizId = null }: { aprendizId?: string | null }) {
  const [items, setItems] = useState<Bitacora[] | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  // Centrado en un aprendiz se ven todas las suyas: «Pendientes» (enviadas por revisar) dejaba la
  // lista vacía justo cuando lo que falta es una que no ha enviado.
  const [filtro, setFiltro] = useState<"TODAS" | "PENDIENTE" | "APROBADA" | "RECHAZADA">(
    aprendizId ? "TODAS" : "PENDIENTE"
  );
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroPrograma, setFiltroPrograma] = useState("");
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    fetch(
      aprendizId
        ? `/api/instructor/bitacoras?aprendiz=${encodeURIComponent(aprendizId)}`
        : "/api/instructor/bitacoras"
    )
      .then((res) => res.json())
      .then((data) => {
        setItems(data.bitacoras ?? []);
        setPlan(data.plan ?? null);
      });
  }

  useEffect(load, [aprendizId]);

  async function avalar(id: string, estado: "APROBADA" | "RECHAZADA") {
    setBusy(id);
    await fetch(`/api/instructor/bitacoras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, observaciones: observaciones[id] ?? null }),
    });
    setBusy(null);
    load();
  }

  if (items === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  // Centrado en un aprendiz que no es de sus fichas (o ya no existe), se avisa y se ve todo.
  const enfocado = aprendizId !== null && plan !== null;
  const base = enfocado ? items.filter((s) => s.user.id === aprendizId) : items;

  const contadores = {
    PENDIENTE: base.filter((s) => s.estado === "PENDIENTE").length,
    APROBADA: base.filter((s) => s.estado === "APROBADA").length,
    RECHAZADA: base.filter((s) => s.estado === "RECHAZADA").length,
  };

  const programasDisponibles = Array.from(
    new Set(items.map((s) => s.user.ficha?.programa).filter((p): p is string => Boolean(p)))
  ).sort((a, b) => a.localeCompare(b));

  const visibles = base.filter((s) => {
    if (filtro !== "TODAS" && s.estado !== filtro) return false;
    if (enfocado) return true;
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
      {aprendizId && !plan && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Ese aprendiz no es de tus fichas: se muestran las bitácoras de todos tus aprendices.
        </p>
      )}
      {enfocado && <PlanBitacoras plan={plan} />}

      {enfocado && (
        <h2 className="pt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Bitácoras que ya envió
        </h2>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="ambar" etiqueta="pendientes" cantidad={contadores.PENDIENTE} />
        <StatBadge tono="verde" etiqueta="aprobadas" cantidad={contadores.APROBADA} />
        <StatBadge tono="rojo" etiqueta="rechazadas" cantidad={contadores.RECHAZADA} />

        {!enfocado && (
          <>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por aprendiz o cédula"
              className={`${inputClass} ml-auto w-48`}
            />
            <select
              value={filtroPrograma}
              onChange={(e) => setFiltroPrograma(e.target.value)}
              className={inputClass}
            >
              <option value="">Todos los programas</option>
              {programasDisponibles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </>
        )}
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as typeof filtro)}
          className={`${inputClass} ${enfocado ? "ml-auto" : ""}`}
        >
          <option value="PENDIENTE">Pendientes</option>
          <option value="APROBADA">Aprobadas</option>
          <option value="RECHAZADA">Rechazadas</option>
          <option value="TODAS">Todas</option>
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {enfocado && base.length === 0
            ? "Todavía no ha enviado ninguna bitácora."
            : "No hay bitácoras en este filtro."}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibles.map((b) => {
            const expandido = expandidoId === b.id;
            return (
              <li
                key={b.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {b.user.nombres} {b.user.apellidos}{" "}
                      <span className="font-normal text-zinc-500 dark:text-zinc-400">
                        · CC {b.user.cedula} · Ficha {b.user.ficha?.codigo ?? "sin asignar"}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      Bitácora {b.numero}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Fecha límite: {formatoFecha(b.fechaLimite)}
                      {b.fechaEntrega && ` · Enviada: ${formatoMomento(b.fechaEntrega)}`}
                    </p>
                    {b.archivoUrl && (
                      <a
                        href={b.archivoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-700 underline dark:text-emerald-500"
                      >
                        Ver bitácora adjunta
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {/* La antigüedad corre desde que el aprendiz la entregó: es lo que el
                        instructor lleva sin revisar, no lo que el aprendiz lleva sin enviar. */}
                    {b.estado === "PENDIENTE" && <PlazoBadge desde={b.fechaEntrega} />}
                    <EstadoBadge estado={b.estado} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandidoId(expandido ? null : b.id)}
                  className="mt-2 text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {expandido ? "Ocultar detalle" : `Ver detalle (${b.actividades.length} actividad(es), ARL)`}
                </button>

                {expandido && (
                  <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <p>Afiliado ARL: {siNo(b.arlAfiliado)}</p>
                      <p>
                        Nivel de riesgo:{" "}
                        {b.arlNivelRiesgo ? nivelRiesgoARLLabel[b.arlNivelRiesgo] : "Sin definir"}
                      </p>
                      <p>Riesgo corresponde: {siNo(b.arlRiesgoCorresponde)}</p>
                      <p>Tiene EPP: {siNo(b.arlTieneEPP)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">Actividades:</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {b.actividades.map((a, i) => (
                          <li key={i}>
                            {a.descripcion}
                            {a.competencias && ` — ${a.competencias}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {b.estado === "PENDIENTE" && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <textarea
                      placeholder="Observaciones (opcional)"
                      value={observaciones[b.id] ?? ""}
                      onChange={(e) =>
                        setObservaciones((prev) => ({ ...prev, [b.id]: e.target.value }))
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => avalar(b.id, "APROBADA")}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Avalar
                      </button>
                      <button
                        type="button"
                        disabled={busy === b.id}
                        onClick={() => avalar(b.id, "RECHAZADA")}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}

                {b.observaciones && b.estado !== "PENDIENTE" && (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Observaciones: {b.observaciones}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type Cupo = {
  numero: number;
  fechaLimite: string;
  estado: EstadoCupoBitacora;
  rechazada: boolean;
  dias: number;
};

type Plan = {
  id: string;
  nombres: string;
  apellidos: string;
  totalBitacoras: number;
  detencion: string | null;
  sinFechaInicio: boolean;
  cumple: boolean;
  aprobadas: number;
  cupos: Cupo[];
};

// Mismos colores que los chips de Seguimiento, de donde se llega aquí.
const cupoEstilo = {
  atrasada: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-300",
  proxima: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-300",
  por_revisar: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-300",
  aprobada:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-300",
  neutro: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400",
};

function dias(n: number): string {
  return `${n} día${n === 1 ? "" : "s"}`;
}

function nombreCorto(plan: Plan): string {
  return plan.nombres.split(" ")[0];
}

// "la bitácora 3" / "las bitácoras 3 y 4" / "las bitácoras 2, 3 y 4".
function lasBitacoras(numeros: number[]): string {
  if (numeros.length === 1) return `la bitácora ${numeros[0]}`;
  return `las bitácoras ${numeros.slice(0, -1).join(", ")} y ${numeros[numeros.length - 1]}`;
}

// Una frase con lo que el aprendiz tiene que hacer ya, antes del detalle de cada bitácora.
function resumenPlan(plan: Plan): { texto: string; urgente: boolean } {
  const nombre = nombreCorto(plan);
  if (plan.sinFechaInicio)
    return { texto: `${nombre} todavía no tiene fecha de inicio de Etapa Productiva: sus bitácoras aún no tienen fecha límite.`, urgente: false };
  if (plan.detencion)
    return { texto: `${plan.detencion}: sus plazos están detenidos, así que ninguna bitácora cuenta como atrasada.`, urgente: false };
  if (plan.cumple)
    return { texto: `${nombre} ya cumple con las bitácoras: ${plan.aprobadas} aprobadas.`, urgente: false };

  const atrasadas = plan.cupos.filter((c) => c.estado === "atrasada");
  const porRevisar = plan.cupos.filter((c) => c.estado === "por_revisar");
  const proxima = plan.cupos.find((c) => c.estado === "proxima");
  const revisar =
    porRevisar.length > 0 ? ` Además tienes por revisar ${lasBitacoras(porRevisar.map((c) => c.numero))}.` : "";

  if (atrasadas.length > 0) {
    const sinEnviar = atrasadas.filter((c) => !c.rechazada).map((c) => c.numero);
    const porReenviar = atrasadas.filter((c) => c.rechazada).map((c) => c.numero);
    const partes = [
      sinEnviar.length > 0 && `enviar ${lasBitacoras(sinEnviar)}`,
      porReenviar.length > 0 && `corregir y reenviar ${lasBitacoras(porReenviar)} (rechazada${porReenviar.length === 1 ? "" : "s"})`,
    ].filter(Boolean);
    const primera = atrasadas[0];
    const vencio =
      atrasadas.length === 1
        ? ` Venció el ${formatoFecha(primera.fechaLimite)}, hace ${dias(primera.dias)}.`
        : ` La más antigua venció hace ${dias(primera.dias)}.`;
    return { texto: `${nombre} debe ${partes.join(" y ")}.${vencio}${revisar}`, urgente: true };
  }
  if (proxima)
    return {
      texto: `${nombre} va al día. La bitácora ${proxima.numero} ${proxima.dias === 0 ? "vence hoy" : `vence en ${dias(-proxima.dias)}`} (${formatoFecha(proxima.fechaLimite)}).${revisar}`,
      urgente: false,
    };
  return { texto: `${nombre} va al día.${revisar}`, urgente: false };
}

function PlanBitacoras({ plan }: { plan: Plan }) {
  const { texto, urgente } = resumenPlan(plan);
  // Con los plazos detenidos o el mínimo ya cumplido, lo no entregado deja de ser una deuda.
  const sinDeuda = plan.detencion !== null || plan.cumple;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Plan de bitácoras
          </p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {plan.nombres} {plan.apellidos}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-medium">
          <Link
            href={`/formulario/expediente/${plan.id}`}
            className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Ver expediente
          </Link>
          <Link
            href="/formulario/instructor/bitacoras"
            className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Ver las bitácoras de todos
          </Link>
        </div>
      </div>

      <p
        className={`mt-2 text-sm ${urgente ? "font-medium text-red-700 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}
      >
        {texto}
      </p>

      {plan.cupos.length > 0 && (
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {plan.cupos.map((c) => {
            const debe = c.estado === "atrasada" || c.estado === "proxima";
            const estilo = sinDeuda && debe ? cupoEstilo.neutro : c.estado === "por_venir" ? cupoEstilo.neutro : cupoEstilo[c.estado];
            const etiqueta =
              c.estado === "aprobada"
                ? "Aprobada"
                : c.estado === "por_revisar"
                  ? "Enviada · por revisar"
                  : c.rechazada
                    ? "Rechazada · sin reenviar"
                    : c.estado === "atrasada"
                      ? sinDeuda
                        ? "Sin enviar"
                        : "No enviada"
                      : c.estado === "proxima"
                        ? "Por enviar"
                        : "Por venir";
            const cuando =
              c.estado === "atrasada" && !sinDeuda
                ? `Venció hace ${dias(c.dias)}`
                : c.estado === "proxima" && !sinDeuda
                  ? c.dias === 0
                    ? "Vence hoy"
                    : `Vence en ${dias(-c.dias)}`
                  : `Límite ${formatoFecha(c.fechaLimite)}`;
            return (
              <li key={c.numero} className={`flex flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-xs ${estilo}`}>
                <span className="text-sm font-semibold">Bitácora {c.numero}</span>
                <span className="font-medium">{etiqueta}</span>
                <span className="opacity-80">{cuando}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
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
