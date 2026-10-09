import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { construirInformeInstructores, type GestionInstructor } from "@/lib/informe-instructores";
import { IndicadorExplicado, LecturaLinea } from "@/components/panorama-aprendices";
import { ImprimirBoton } from "@/components/imprimir-boton";
import type { Tono } from "@/lib/lectura-indicadores";

export const dynamic = "force-dynamic";

// Gestión de instructores (pedido de Coordinación, 9 oct 2026; solo Coordinación y Admin): cómo va
// el seguimiento y control del acompañamiento de los aprendices de cada instructor. Lógica en
// src/lib/informe-instructores.ts.

const CHIP: Record<Tono, { texto: string; clase: string }> = {
  atencion: { texto: "! Pide acción", clase: "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800" },
  regular: { texto: "! Revisar", clase: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800" },
  bien: { texto: "✓ Bien", clase: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800" },
  neutro: { texto: "• Sin datos", clase: "bg-zinc-50 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700" },
};

function peorTono(i: GestionInstructor): Tono {
  const tonos = Object.values(i.lecturas).map((l) => l.tono);
  if (tonos.includes("atencion")) return "atencion";
  if (tonos.includes("regular")) return "regular";
  if (tonos.includes("bien")) return "bien";
  return "neutro";
}

function Chip({ tono }: { tono: Tono }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${CHIP[tono].clase}`}>{CHIP[tono].texto}</span>;
}

const th =
  "border-b border-zinc-200 px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400";
const td = "border-b border-zinc-100 px-2 py-2 align-top text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200";

function GruposBarra({ g, total }: { g: GestionInstructor["grupos"]; total: number }) {
  const tramos = [
    { n: g.alDia, clase: "bg-[#0ca30c]", etiqueta: "Al día" },
    { n: g.enRiesgo, clase: "bg-[#d03b3b]", etiqueta: "Necesitan atención" },
    { n: g.porCertificar + g.certificados, clase: "bg-sky-500", etiqueta: "Por certificar o certificados" },
    { n: g.enPausa, clase: "bg-zinc-300 dark:bg-zinc-600", etiqueta: "En pausa o retirados" },
  ];
  if (!total) return <span className="text-xs text-zinc-400">Sin aprendices</span>;
  return (
    <div className="flex h-3 w-full min-w-32 gap-[2px] overflow-hidden rounded-[4px]">
      {tramos.map((t) =>
        t.n ? (
          <span
            key={t.etiqueta}
            title={`${t.etiqueta}: ${t.n}`}
            className={`h-full print:[print-color-adjust:exact] ${t.clase}`}
            style={{ width: `${(t.n / total) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

export default async function GestionInstructoresPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);
  const r = await construirInformeInstructores();
  const conFichas = r.instructores.filter((i) => i.aprendices > 0);
  const sinFichas = r.instructores.filter((i) => i.aprendices === 0);

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 print:px-0 print:py-0">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 print:text-black">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sena">Reportes</p>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Gestión de instructores</h1>
            <p className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
              Cómo va el acompañamiento de cada instructor a los aprendices de sus fichas: si van al día, si revisa a
              tiempo lo que le entregan y si valora los momentos que ya se hicieron. Sirve para apoyar, no para
              sancionar: cada número dice qué mide y cómo leerlo.
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <IndicadorExplicado
            etiqueta="Instructores con fichas"
            valor={r.centro.instructores}
            significado="Instructores que hoy acompañan al menos una ficha con aprendices."
            lectura={{ texto: `${sinFichas.length} más no tienen fichas asignadas.`, tono: "neutro" }}
          />
          <IndicadorExplicado
            etiqueta="Entregas esperando revisión"
            valor={r.centro.pendientes}
            detalle={`${r.centro.demoradas} con más de ${r.plazoRevision} días hábiles`}
            significado="Formalizaciones, bitácoras, certificaciones, momentos y solicitudes de reunión que esperan al instructor."
            lectura={
              r.centro.demoradas
                ? { texto: `${r.centro.demoradas} ya pasaron el plazo de referencia: ver quién las tiene abajo.`, tono: "atencion" }
                : { texto: "Ninguna pasa el plazo de referencia.", tono: "bien" }
            }
          />
          <IndicadorExplicado
            etiqueta="Momentos valorados"
            valor={`${r.centro.momentosValorados} de ${r.centro.momentosRealizados}`}
            significado="Reuniones de los Momentos 1, 2 y 3 que ya se hicieron y tienen su valoración registrada."
            lectura={
              r.centro.momentosRealizados === r.centro.momentosValorados
                ? { texto: "Todos los momentos realizados están valorados.", tono: "bien" }
                : {
                    texto: `${r.centro.momentosRealizados - r.centro.momentosValorados} momentos realizados siguen sin valorar.`,
                    tono: "regular",
                  }
            }
          />
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:break-inside-avoid">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Comparativo</h2>
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            Primero quien más necesita apoyo. El color de la barra es el mismo del panorama de Reportes.
          </p>
          {conFichas.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Ningún instructor tiene fichas con aprendices.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse tabular-nums">
                <thead>
                  <tr>
                    {["Instructor", "Aprendices", "Cómo van", "Al día", "Por revisar", "Respuesta promedio", "Momentos valorados", "Lectura"].map((e) => (
                      <th key={e} className={th}>
                        {e}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conFichas.map((i) => {
                    const enPractica = i.grupos.alDia + i.grupos.enRiesgo;
                    return (
                      <tr key={i.id}>
                        <td className={td}>
                          <a href={`#instructor-${i.id}`} className="font-medium underline print:no-underline">
                            {i.nombre}
                          </a>
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                            {i.fichas.length} ficha{i.fichas.length === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className={td}>
                          {i.aprendices}
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{i.activos} activos{i.sobreTope ? " · sobre el tope" : ""}</span>
                        </td>
                        <td className={`${td} min-w-36`}>
                          <GruposBarra g={i.grupos} total={i.aprendices} />
                        </td>
                        <td className={td}>
                          {enPractica ? `${Math.round((i.grupos.alDia / enPractica) * 100)} %` : "—"}
                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{i.grupos.enRiesgo} necesitan atención</span>
                        </td>
                        <td className={td}>
                          {i.pendientes.length}
                          {i.demoradas > 0 && (
                            <span className="block text-xs font-medium text-red-700 dark:text-red-300">! {i.demoradas} demoradas</span>
                          )}
                        </td>
                        <td className={td}>{i.respuesta.promedioDias === null ? "—" : `${i.respuesta.promedioDias} días hábiles`}</td>
                        <td className={td}>
                          {i.momentos.realizados ? `${i.momentos.valorados} de ${i.momentos.realizados}` : "—"}
                        </td>
                        <td className={td}>
                          <Chip tono={peorTono(i)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {conFichas.map((i) => {
          const enPractica = i.grupos.alDia + i.grupos.enRiesgo;
          return (
            <section
              key={i.id}
              id={`instructor-${i.id}`}
              className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:break-inside-avoid"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{i.nombre}</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {i.fichas.length === 1 ? "Ficha" : "Fichas"} {i.fichas.join(", ")} · {i.aprendices} aprendices · {i.activos} activos
                    {i.sobreTope ? " · ! por encima del tope de 80" : ""}
                  </p>
                </div>
                <Chip tono={peorTono(i)} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <IndicadorExplicado
                  etiqueta="¿Sus aprendices van al día?"
                  valor={enPractica ? `${i.grupos.alDia} de ${enPractica}` : "—"}
                  detalle={`${i.grupos.enRiesgo} necesitan atención · ${i.grupos.porCertificar + i.grupos.certificados} terminaron evidencias`}
                  significado="Aprendices en práctica sin ninguna entrega vencida."
                  lectura={i.lecturas.alDia}
                />
                <IndicadorExplicado
                  etiqueta="¿Revisa a tiempo?"
                  valor={i.pendientes.length}
                  detalle={`esperando revisión · ${i.demoradas} con más de ${r.plazoRevision} días hábiles`}
                  significado={`Entregas que esperan al instructor. Referencia: ${r.plazoRevision} días hábiles, el plazo de aval de la guía.`}
                  lectura={i.lecturas.revision}
                />
                <IndicadorExplicado
                  etiqueta="¿Cuánto tarda en responder?"
                  valor={i.respuesta.promedioDias === null ? "—" : `${i.respuesta.promedioDias} días`}
                  detalle={`hábiles, en promedio · ${i.respuesta.revisadas} revisiones`}
                  significado="Tiempo entre la entrega del aprendiz (o la reunión) y la revisión del instructor."
                  lectura={i.lecturas.respuesta}
                />
                <IndicadorExplicado
                  etiqueta="¿Valora los momentos?"
                  valor={i.momentos.realizados ? `${i.momentos.valorados} de ${i.momentos.realizados}` : "—"}
                  detalle="momentos ya realizados"
                  significado="Reuniones de los Momentos 1, 2 y 3 que ya pasaron y tienen su valoración (la rúbrica)."
                  lectura={i.lecturas.momentos}
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem]">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Lo que espera su revisión</h3>
                  {i.pendientes.length === 0 ? (
                    <LecturaLinea lectura={{ texto: "Nada pendiente.", tono: "bien" }} />
                  ) : (
                    <ul className="flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                      {i.pendientes.slice(0, 8).map((p, k) => (
                        <li key={k} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <span>
                            <Link href={`/formulario/expediente/${p.aprendizId}`} className="font-medium underline print:no-underline">
                              {p.aprendiz}
                            </Link>
                            <span className="text-zinc-500 dark:text-zinc-400"> · {p.evidencia}</span>
                          </span>
                          <span
                            className={`text-xs tabular-nums ${p.dias > r.plazoRevision ? "font-semibold text-red-700 dark:text-red-300" : "text-zinc-500 dark:text-zinc-400"}`}
                          >
                            {p.dias > r.plazoRevision ? "! " : ""}
                            {p.dias} {p.dias === 1 ? "día hábil" : "días hábiles"} esperando
                          </span>
                        </li>
                      ))}
                      {i.pendientes.length > 8 && (
                        <li className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">y {i.pendientes.length - 8} más</li>
                      )}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Acompañamiento</h3>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    {[
                      ["Reuniones extraordinarias atendidas", i.acompanamiento.extraordinariasAtendidas],
                      ["Solicitudes de reunión sin responder", i.acompanamiento.extraordinariasPendientes],
                      ["Planes de mejoramiento elaborados", i.acompanamiento.planesElaborados],
                      ["Novedades que registró", i.acompanamiento.novedadesRegistradas],
                    ].map(([etiqueta, n]) => (
                      <div key={etiqueta as string} className="flex justify-between gap-3 border-b border-zinc-100 pb-1 dark:border-zinc-800">
                        <dt className="text-zinc-600 dark:text-zinc-300">{etiqueta}</dt>
                        <dd className="tabular-nums font-medium text-zinc-900 dark:text-zinc-50">{n}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </section>
          );
        })}

        {sinFichas.length > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Sin fichas asignadas: {sinFichas.map((i) => i.nombre).join(", ")}.
          </p>
        )}

        <details className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 print:hidden">
          <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-100">¿Cómo se calcula?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>«Al día» y «necesitan atención» son exactamente los mismos grupos del panorama de Reportes.</li>
            <li>«Por revisar» cuenta formalizaciones, bitácoras y certificaciones enviadas sin revisar, momentos cuya reunión ya pasó sin valoración y solicitudes de reunión extraordinaria sin respuesta. La alternativa EP no entra: la avala Coordinación.</li>
            <li>«Demorada» es la que lleva más de {r.plazoRevision} días hábiles esperando, el plazo de aval que la guía fija a la institución. Es una referencia para leer, no una regla.</li>
            <li>El tiempo de respuesta va de la entrega (o de la reunión) a la revisión. Si el aprendiz corrigió y reenvió, cuenta desde la primera entrega.</li>
            <li>Los aprendices en pausa, retirados o certificados no generan pendientes nuevos.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}
