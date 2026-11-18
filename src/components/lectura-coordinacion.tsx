import Link from "next/link";
import { LecturaLinea } from "@/components/panorama-aprendices";
import type { LecturaCoordinacion } from "@/lib/lectura-coordinaciones";

// Cierre de los tableros de Coordinación de Formación y de Coordinación Académica: cada frente de
// gestión de su resolución con la cifra de SEPA que lo mide, las recomendaciones que se desprenden
// de esas cifras (las urgentes primero) y lo que SEPA no mide. Ver src/lib/lectura-coordinaciones.ts.
export function LecturaCoordinacionVista({
  lectura: l,
  titulo,
  id = "recomendaciones",
}: {
  lectura: LecturaCoordinacion;
  titulo: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="flex scroll-mt-6 flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:break-before-page print:border-zinc-300"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-sena-oscuro dark:text-emerald-400">{l.resolucion}</p>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 [text-wrap:balance]">{titulo}</h2>
        <p className="text-base text-zinc-700 dark:text-zinc-200">{l.resumen}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{l.nota}</p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {l.items.map((i) => (
          <li
            key={i.funcion + i.titulo}
            className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 print:break-inside-avoid"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{i.titulo}</p>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {i.funcion}
              </span>
            </div>
            <p className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{i.cifra}</p>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{i.detalle}</p>
            <div className="mt-auto flex flex-col gap-2 pt-1">
              <LecturaLinea lectura={i.lectura} />
              {i.href && (
                <Link href={i.href} className="text-xs font-medium text-azul underline dark:text-sky-300 print:hidden">
                  Ver el detalle
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recomendaciones</h3>
        {l.recomendaciones.length ? (
          <ol className="flex flex-col gap-2">
            {l.recomendaciones.map((r, k) => (
              <li
                key={k}
                className="flex gap-3 rounded-lg bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200 print:break-inside-avoid"
              >
                <span className="font-semibold tabular-nums text-zinc-400 dark:text-zinc-500">{k + 1}</span>
                <span className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    {r.urgente && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
                        ! Prioridad
                      </span>
                    )}
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{r.funcion}</span>
                  </span>
                  <span>{r.texto}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Con las cifras de hoy no hay recomendaciones: ningún frente lo pide.</p>
        )}
      </div>

      <div className="flex flex-col gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Lo que SEPA no mide (no se estima)</p>
        <ul className="list-disc pl-5 text-xs text-zinc-500 dark:text-zinc-400">
          {l.noMide.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
