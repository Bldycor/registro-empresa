import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { construirInformeFunciones, type InformeFunciones, type Relacion } from "@/lib/informe-funciones";
import { ImprimirBoton } from "@/components/imprimir-boton";

export const dynamic = "force-dynamic";

// Informe de funciones en la empresa (4 oct 2026): qué hacen los aprendices en su práctica, por
// ficha y programa, cómo se relaciona con las competencias técnicas del programa y qué funciones
// no contempla ninguna, como insumo para mejorar el programa. Solo Coordinación y Administrador.
// La lógica está en src/lib/informe-funciones.ts.

const RELACION: Record<Relacion, { etiqueta: string; clase: string; icono: string }> = {
  coincide: { etiqueta: "Coincide con una competencia", clase: "bg-sena", icono: "✓" },
  declarada: {
    etiqueta: "Solo la eligió el aprendiz",
    clase: "bg-[#a7d98a] dark:bg-[#4d7a35]",
    icono: "~",
  },
  ninguna: { etiqueta: "No contemplada", clase: "bg-zinc-300 dark:bg-zinc-600", icono: "○" },
};

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)} %` : "—");
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const campo =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950";
const th =
  "border-b border-zinc-200 px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400";
const td = "border-b border-zinc-100 px-2 py-2 align-top text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200";

function Tarjeta({ titulo, descripcion, id, children }: { titulo: string; descripcion?: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:break-inside-avoid print:border-zinc-300">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{titulo}</h2>
      {descripcion && <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">{descripcion}</p>}
      {children}
    </section>
  );
}

function Indicador({ etiqueta, valor, detalle, atencion = false }: { etiqueta: string; valor: string | number; detalle: string; atencion?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        atencion
          ? "border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {atencion && (
          <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            !
          </span>
        )}
        {etiqueta}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{valor}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{detalle}</p>
    </div>
  );
}

// Barras horizontales de un solo tono, valor al final, tooltip con el detalle.
function Barras({ filas }: { filas: { etiqueta: string; valor: number; detalle: string; resaltar?: boolean }[] }) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="flex flex-col gap-2">
      {filas.map((f) => (
        <li key={f.etiqueta} title={`${f.etiqueta} — ${f.detalle}`} className="flex flex-col gap-1">
          <span className="text-sm leading-snug text-zinc-700 dark:text-zinc-300">{f.etiqueta}</span>
          <span className="flex items-center gap-2">
            {f.valor > 0 ? (
              <span
                className="h-3.5 rounded-r-[4px] bg-azul dark:bg-sky-400 print:bg-zinc-700"
                style={{ width: `${(f.valor / maximo) * 70}%`, minWidth: 4 }}
              />
            ) : (
              <span aria-hidden className="text-xs font-semibold text-amber-700 dark:text-amber-300">!</span>
            )}
            <span className={`whitespace-nowrap text-xs tabular-nums ${f.resaltar ? "font-medium text-amber-700 dark:text-amber-300" : "text-zinc-600 dark:text-zinc-400"}`}>
              {f.detalle}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function BarraRelacion({ c }: { c: { total: number; coincide: number; declarada: number; ninguna: number } }) {
  if (!c.total) return <span className="text-xs text-zinc-400">Sin funciones registradas</span>;
  return (
    <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-[4px]">
      {(Object.keys(RELACION) as Relacion[]).map((k) =>
        c[k] ? (
          <span
            key={k}
            title={`${RELACION[k].etiqueta}: ${c[k]} de ${c.total} (${pct(c[k], c.total)})`}
            className={`h-full print:[print-color-adjust:exact] ${RELACION[k].clase}`}
            style={{ width: `${(c[k] / c.total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

function LeyendaRelacion() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
      {(Object.keys(RELACION) as Relacion[]).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${RELACION[k].clase}`} />
          <span aria-hidden className="font-semibold">{RELACION[k].icono}</span>
          {RELACION[k].etiqueta}
        </li>
      ))}
    </ul>
  );
}

const ICONO_RECOMENDACION: Record<string, { icono: string; titulo: string }> = {
  datos: { icono: "ℹ️", titulo: "Alcance del análisis" },
  brecha: { icono: "🧩", titulo: "Función no contemplada en las competencias" },
  competencia: { icono: "🎯", titulo: "Competencia sin práctica" },
  registro: { icono: "📝", titulo: "Calidad del registro" },
};

export default async function InformeFuncionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["COORDINADOR", "ADMIN"]);
  const sp = await searchParams;
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const r: InformeFunciones = await construirInformeFunciones({ programa: texto("programa"), ficha: texto("ficha") });
  const k = r.kpi;
  const noContempladas = k.cobertura.declarada + k.cobertura.ninguna;
  const hayFiltros = Boolean(r.filtros.programa || r.filtros.ficha);

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 print:px-0 print:py-0">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 print:text-black">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sena">Reportes</p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Funciones en la empresa</h1>
            <p className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
              Qué hacen los aprendices en su práctica —lo asignado en el plan del Momento 1 y lo que
              reportan en sus bitácoras—, comparado con las competencias técnicas de su programa.
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Link
              href="/formulario/reportes"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Otros reportes
            </Link>
            <ImprimirBoton />
          </div>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 print:hidden">
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Programa de formación
            <select name="programa" defaultValue={r.filtros.programa} className={`${campo} max-w-80`}>
              <option value="">Todos</option>
              {r.opciones.programas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Ficha
            <select name="ficha" defaultValue={r.filtros.ficha} className={campo}>
              <option value="">Todas</option>
              {r.opciones.fichas.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-md bg-sena px-4 py-1.5 text-sm font-medium text-white hover:bg-sena-oscuro">
            Aplicar filtros
          </button>
          {hayFiltros && (
            <Link href="/formulario/reportes/funciones" className="px-2 py-1.5 text-sm text-zinc-600 underline dark:text-zinc-400">
              Quitar filtros
            </Link>
          )}
        </form>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Indicador
            etiqueta="Funciones analizadas"
            valor={k.funciones}
            detalle={`${k.realizadas} reportadas en bitácoras · ${k.asignadas} asignadas en el plan`}
          />
          <Indicador
            etiqueta="Aprendices con registro"
            valor={k.aprendicesConFunciones}
            detalle={`de ${plural(k.aprendices, "aprendiz", "aprendices")} · ${plural(k.fichas, "ficha", "fichas")}`}
          />
          <Indicador
            etiqueta="Coinciden con competencias"
            valor={pct(k.cobertura.coincide, k.funciones)}
            detalle={`${k.cobertura.coincide} funciones se parecen a una competencia técnica`}
          />
          <Indicador
            etiqueta="No contempladas"
            valor={noContempladas}
            detalle="Sin competencia técnica que las describa"
            atencion={noContempladas > 0}
          />
        </div>

        {k.funciones === 0 ? (
          <Tarjeta titulo="Todavía no hay funciones para analizar">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Este informe se llena con las actividades de las bitácoras y el plan de trabajo del Momento 1.
              Con los filtros elegidos ningún aprendiz las ha registrado aún en SEPA.
            </p>
          </Tarjeta>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Tarjeta titulo="Funciones más comunes" descripcion="Las funciones con las mismas palabras clave se cuentan juntas. Ordenadas por cuántos aprendices las hacen.">
                <Barras
                  filas={r.funcionesComunes.map((f) => ({
                    etiqueta: f.texto,
                    valor: f.menciones,
                    detalle: `${plural(f.menciones, "mención", "menciones")} · ${plural(f.aprendices, "aprendiz", "aprendices")}`,
                  }))}
                />
              </Tarjeta>
              <Tarjeta titulo="Palabras que más se repiten" descripcion="El vocabulario de la práctica: de qué hablan los aprendices cuando describen su trabajo.">
                <ul className="flex flex-wrap gap-2">
                  {r.palabrasFrecuentes.map((p, i) => {
                    const max = r.palabrasFrecuentes[0]?.menciones || 1;
                    return (
                      <li
                        key={p.raiz}
                        title={`${p.palabra}: ${plural(p.menciones, "mención", "menciones")}, ${plural(p.aprendices, "aprendiz", "aprendices")}`}
                        className={`relative overflow-hidden rounded-full border px-3 py-1 text-sm ${
                          i < 3
                            ? "border-sena/50 bg-sena-claro font-medium text-azul dark:border-sena/40 dark:bg-zinc-800 dark:text-zinc-100"
                            : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                        }`}
                      >
                        {p.palabra}
                        <span className="ml-1.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{p.menciones}</span>
                        <span
                          aria-hidden
                          className="absolute bottom-0 left-0 h-[3px] bg-sena"
                          style={{ width: `${(p.menciones / max) * 100}%` }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Tarjeta>
            </div>

            {r.porPrograma.map((p) => (
              <Tarjeta
                key={p.programa}
                titulo={p.programa}
                descripcion={`${plural(p.cobertura.total, "función", "funciones")} de ${plural(p.aprendicesConFunciones, "aprendiz", "aprendices")} comparadas con ${plural(p.competencias.length, "competencia técnica", "competencias técnicas")} del programa${p.transversales ? ` (las ${p.transversales} básicas y clave son transversales y no se comparan)` : ""}.`}
              >
                <div className="flex flex-col gap-2">
                  <LeyendaRelacion />
                  <BarraRelacion c={p.cobertura} />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {pct(p.cobertura.coincide, p.cobertura.total)} coincide con una competencia ·{" "}
                    {pct(p.cobertura.declarada, p.cobertura.total)} solo por elección del aprendiz ·{" "}
                    {pct(p.cobertura.ninguna, p.cobertura.total)} no contemplada
                  </p>
                </div>

                {p.competencias.length === 0 ? (
                  <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
                    ! El programa no tiene competencias técnicas cargadas: no hay con qué comparar. Cárgalas en Competencias.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Competencias técnicas vs. funciones</h3>
                      <Barras
                        filas={p.competencias.map((c) => ({
                          etiqueta: c.competencia,
                          valor: c.funciones,
                          detalle: c.funciones
                            ? `${plural(c.funciones, "función", "funciones")} · ${plural(c.aprendices, "aprendiz", "aprendices")}`
                            : "Sin funciones relacionadas",
                          resaltar: c.funciones === 0,
                        }))}
                      />
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Funciones que no contemplan las competencias</h3>
                      {p.sinRelacion.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Todas las funciones se parecen a alguna competencia técnica.</p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {p.sinRelacion.map((g) => (
                            <li key={g.tema} className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/20">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                «{g.tema}» <span className="font-normal text-zinc-500 dark:text-zinc-400">· {plural(g.funciones, "función", "funciones")} · {plural(g.aprendices, "aprendiz", "aprendices")}</span>
                              </p>
                              <ul className="mt-1 list-disc pl-5 text-xs text-zinc-600 dark:text-zinc-300">
                                {g.ejemplos.map((e) => (
                                  <li key={e}>{e}</li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </Tarjeta>
            ))}

            <Tarjeta titulo="Por ficha" descripcion="Cada grupo de aprendices: cuántos registran funciones, cuáles son las principales y qué tanto coinciden con las competencias.">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse tabular-nums">
                  <thead>
                    <tr>
                      {["Ficha", "Programa", "Aprendices con registro", "Funciones", "Principales funciones", "Coincidencia"].map((e) => (
                        <th key={e} className={th}>
                          {e}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.porFicha.map((f) => (
                      <tr key={f.ficha}>
                        <td className={`${td} font-medium`}>{f.ficha}</td>
                        <td className={td}>{f.programa}</td>
                        <td className={td}>
                          {f.aprendicesConFunciones} de {f.aprendices}
                        </td>
                        <td className={td}>{f.cobertura.total}</td>
                        <td className={td}>
                          {f.principales.length ? (
                            <ol className="list-decimal pl-4 text-xs">
                              {f.principales.map((x) => (
                                <li key={x.texto}>
                                  {x.texto} <span className="text-zinc-400">×{x.n}</span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={`${td} min-w-40`}>
                          <BarraRelacion c={f.cobertura} />
                          {f.cobertura.total > 0 && (
                            <span className="mt-1 block text-xs text-zinc-500">{pct(f.cobertura.coincide, f.cobertura.total)} coincide</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>

            <Tarjeta
              titulo="Recomendaciones para el programa de formación"
              descripcion="Salen de comparar lo que hacen los aprendices con el catálogo de competencias. Son puntos de partida para el equipo curricular, no conclusiones: revísalas con el detalle de abajo."
            >
              {r.recomendaciones.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin recomendaciones: las funciones reportadas coinciden con las competencias.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {r.recomendaciones.map((rec, i) => (
                    <li key={i} className="flex gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                      <span aria-hidden className="text-lg leading-6">
                        {ICONO_RECOMENDACION[rec.tipo]?.icono}
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {ICONO_RECOMENDACION[rec.tipo]?.titulo}
                          {rec.programa && <> · {rec.programa}</>}
                        </p>
                        <p className="text-sm text-zinc-800 dark:text-zinc-200">{rec.texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>

            <Tarjeta titulo="Detalle por ficha" descripcion="Cada función con su origen y la competencia con la que se relaciona. Ábrelo para verificar el análisis.">
              <div className="flex flex-col gap-2">
                {r.porFicha
                  .filter((f) => f.funciones.length)
                  .map((f) => (
                    <details key={f.ficha} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        Ficha {f.ficha} · {plural(f.funciones.length, "función", "funciones")}
                      </summary>
                      <div className="overflow-x-auto px-3 pb-3">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr>
                              {["Aprendiz", "Origen", "Función", "Relación", "Competencia"].map((e) => (
                                <th key={e} className={th}>
                                  {e}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {f.funciones.map((fn, i) => (
                              <tr key={i}>
                                <td className={`${td} whitespace-nowrap`}>
                                  <Link href={`/formulario/expediente/${fn.aprendizId}`} className="underline print:no-underline">
                                    {fn.aprendiz}
                                  </Link>
                                </td>
                                <td className={`${td} whitespace-nowrap text-xs`}>
                                  {fn.origen === "asignada" ? "Plan (Momento 1)" : `Bitácora ${fn.bitacora}`}
                                </td>
                                <td className={td}>{fn.texto}</td>
                                <td className={`${td} whitespace-nowrap text-xs`}>
                                  <span className="inline-flex items-center gap-1.5">
                                    <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${RELACION[fn.relacion].clase}`} />
                                    {RELACION[fn.relacion].etiqueta}
                                  </span>
                                </td>
                                <td className={`${td} text-xs`}>{fn.competencia ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
              </div>
            </Tarjeta>
          </>
        )}

        <details className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 print:hidden">
          <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-100">¿Cómo se calcula?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Cada actividad de bitácora y el plan de trabajo del Momento 1 se parten en funciones (por renglón, viñeta u oración).</li>
            <li>Cada función se compara por palabras clave con el nombre y los resultados de aprendizaje de las competencias técnicas del programa; las palabras que comparten casi todas las competencias pesan menos.</li>
            <li>«Coincide» es parecido por contenido; «Solo la eligió el aprendiz» es que no se parece a ninguna, pero el aprendiz la asoció a una en la bitácora; «No contemplada» es ni lo uno ni lo otro.</li>
            <li>No se usa inteligencia artificial ni se inventa nada: todo sale del texto que registraron los aprendices y del catálogo que carga Coordinación.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
