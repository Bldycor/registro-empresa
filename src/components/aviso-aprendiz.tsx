"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ChecklistItem, EstadoSeguimiento } from "@/lib/seguimiento-evidencias";

// Aviso con el que se abre una pantalla de evidencias desde un chip de Seguimiento
// (`?aprendiz=<id>`): de quién se trata, cómo va en esa evidencia —el mismo texto del chip,
// que ya nombra la pieza atrasada— y qué dice lo que ha enviado (`entregas`, lo arma cada
// pantalla con sus registros). Lo que falta suele ser justo lo que el aprendiz no ha enviado,
// así que la lista de abajo, sola, no lo muestra.

export type LineaEntrega = { texto: string; tono: "rojo" | "ambar" | "verde" | "neutro" };

const tonoTexto: Record<LineaEntrega["tono"], string> = {
  rojo: "text-red-700 dark:text-red-400",
  ambar: "text-amber-800 dark:text-amber-400",
  verde: "text-emerald-700 dark:text-emerald-400",
  neutro: "text-zinc-600 dark:text-zinc-400",
};

const tonoChip: Record<EstadoSeguimiento, string> = {
  atrasada: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-300",
  proxima: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-300",
  completa:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-300",
  pendiente: "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400",
};

type Datos = { id: string; nombres: string; apellidos: string; checklist: ChecklistItem[] };

export function AvisoAprendiz({
  aprendizId,
  claves,
  entregas,
  verTodos,
}: {
  aprendizId: string;
  claves: ChecklistItem["clave"][];
  entregas: LineaEntrega[];
  // La misma pantalla sin el aprendiz.
  verTodos: string;
}) {
  const [datos, setDatos] = useState<Datos | null | "ajeno">(null);

  useEffect(() => {
    fetch(`/api/instructor/seguimiento/${encodeURIComponent(aprendizId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDatos(data?.aprendiz ?? "ajeno"))
      .catch(() => setDatos("ajeno"));
  }, [aprendizId]);

  if (datos === null) return null;
  if (datos === "ajeno") {
    return (
      <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        Ese aprendiz no es de tus fichas.{" "}
        <Link href={verTodos} className="font-medium underline">
          Ver los de todos tus aprendices
        </Link>
      </p>
    );
  }

  const items = datos.checklist.filter((c) => claves.includes(c.clave));

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Desde Seguimiento
          </p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {datos.nombres} {datos.apellidos}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-medium">
          <Link
            href={`/formulario/expediente/${datos.id}`}
            className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Ver expediente
          </Link>
          <Link
            href={verTodos}
            className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Ver los de todos
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((c) => (
          <span key={c.clave} className={`rounded-lg border px-2.5 py-1.5 text-xs ${tonoChip[c.estado]}`}>
            <span className="font-medium">{c.etiqueta}</span> · {c.detalle}
          </span>
        ))}
      </div>

      {entregas.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {entregas.map((l) => (
            <li key={l.texto} className={tonoTexto[l.tono]}>
              {l.texto}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Lo que dice el registro de una evidencia de un solo documento (Alternativa, Formalización,
// Certificación). `doc` va con su artículo: «el documento de formalización».
export function entregaDocumento(registros: { estado: string }[], doc: string): LineaEntrega {
  const Doc = doc.charAt(0).toUpperCase() + doc.slice(1);
  // Si ya venció lo dice el chip de arriba, en rojo; aquí solo qué hay.
  if (registros.length === 0) return { texto: `Todavía no ha enviado ${doc}.`, tono: "ambar" };
  if (registros.some((r) => r.estado === "APROBADA")) return { texto: `${Doc} ya tiene aval.`, tono: "verde" };
  if (registros.some((r) => r.estado === "PENDIENTE"))
    return { texto: `${Doc} ya llegó y espera revisión (abajo).`, tono: "ambar" };
  return { texto: `${Doc} no se aprobó: debe corregir y reenviar.`, tono: "rojo" };
}
