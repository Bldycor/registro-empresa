import Link from "next/link";
import { describirFiltros, porcentaje, type Reporte } from "@/lib/reportes";
import { formatoMomento } from "@/lib/plazos-institucionales";
import { estadoAprendizLabel } from "@/lib/validations";
import { ImprimirBoton } from "@/components/imprimir-boton";

// Vista de los tres reportes (ver `construirReporte`). Es un componente de servidor: los filtros
// son un formulario GET, así que la URL guarda la consulta y el Excel usa exactamente la misma.

function dia(d: Date | null): string {
  return d ? d.toLocaleDateString("es-CO", { timeZone: "UTC" }) : "—";
}

const campo =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950";
const th =
  "border-b border-zinc-200 px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400";
const td = "border-b border-zinc-100 px-2 py-1.5 align-top text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200";

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:rounded-none print:border-zinc-300 print:p-3">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{titulo}</h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{descripcion}</p>
      {children}
    </section>
  );
}

function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: string | number; detalle?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800 print:border-zinc-300">
      <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
      <p className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{valor}</p>
      {detalle && <p className="text-xs text-zinc-500 dark:text-zinc-400">{detalle}</p>}
    </div>
  );
}

function Tabla({ encabezados, children }: { encabezados: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr>
            {encabezados.map((e) => (
              <th key={e} className={th}>
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ReportesVista({ reporte: r, excelHref }: { reporte: Reporte; excelHref: string }) {
  const f = r.filtros;
  const m = r.metricas;
  const hayFiltros = Object.values(f).some(Boolean);

  return (
    <div className="flex flex-col gap-4 print:gap-3 print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Reportes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {m.aprendices} aprendice{m.aprendices === 1 ? "" : "s"} · {describirFiltros(r)} ·
            Generado el {formatoMomento(r.generado)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <a
            href={excelHref}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Descargar Excel
          </a>
          <ImprimirBoton />
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 print:hidden">
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Ficha
          <select name="ficha" defaultValue={f.ficha} className={campo}>
            <option value="">Todas</option>
            {r.opciones.fichas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Instructor
          <select name="instructor" defaultValue={f.instructor} className={campo}>
            <option value="">Todos</option>
            {r.opciones.instructores.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Empresa
          <select name="empresa" defaultValue={f.empresa} className={`${campo} max-w-56`}>
            <option value="">Todas</option>
            {r.opciones.empresas.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Estado
          <select name="estado" defaultValue={f.estado} className={campo}>
            <option value="">Todos</option>
            {Object.entries(estadoAprendizLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          Inicio de EP desde
          <input type="date" name="desde" defaultValue={f.desde} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          hasta
          <input type="date" name="hasta" defaultValue={f.hasta} className={campo} />
        </label>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Aplicar filtros
        </button>
        {hayFiltros && (
          <Link href="/formulario/reportes" className="px-2 py-1.5 text-sm text-zinc-600 underline dark:text-zinc-400">
            Quitar filtros
          </Link>
        )}
      </form>

      <Seccion titulo="Métricas" descripcion="Totales de los aprendices que cumplen los filtros.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {m.porEstado.map((e) => (
            <Cifra key={e.estado} etiqueta={e.etiqueta} valor={e.cantidad} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cifra
            etiqueta="Bitácoras a tiempo"
            valor={porcentaje(m.bitacoras.aTiempo, m.bitacoras.entregadas)}
            detalle={`${m.bitacoras.aTiempo} de ${m.bitacoras.entregadas} entregadas · ${m.bitacoras.conAtraso} con atraso`}
          />
          <Cifra etiqueta="Bitácoras aprobadas" valor={m.bitacoras.aprobadas} />
          <Cifra
            etiqueta="Rúbrica en «Satisfactorio»"
            valor={porcentaje(m.rubrica.satisfactorio, m.rubrica.valoradas)}
            detalle={`${m.rubrica.satisfactorio} de ${m.rubrica.valoradas} variables valoradas (Momentos 2 y 3)`}
          />
          <Cifra
            etiqueta="Juicio final (Momento 3)"
            valor={`${m.momento3.aprobados} aprobado${m.momento3.aprobados === 1 ? "" : "s"}`}
            detalle={`${m.momento3.noAprobados} no aprobado${m.momento3.noAprobados === 1 ? "" : "s"}`}
          />
        </div>
      </Seccion>

      <Seccion
        titulo="Cumplimiento"
        descripcion="Cómo va cada evidencia en conjunto, y quiénes tienen evidencias atrasadas o causal de deserción."
      >
        <Tabla encabezados={["Evidencia", "Completa", "Atrasada", "Próxima a vencer", "Pendiente"]}>
          {r.cumplimiento.porEvidencia.map((e) => (
            <tr key={e.clave}>
              <td className={td}>{e.etiqueta}</td>
              <td className={td}>{e.completa}</td>
              <td className={`${td} ${e.atrasada ? "font-semibold text-red-700 dark:text-red-400" : ""}`}>{e.atrasada}</td>
              <td className={td}>{e.proxima}</td>
              <td className={td}>{e.pendiente}</td>
            </tr>
          ))}
        </Tabla>
        <h3 className="mb-2 mt-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Aprendices en riesgo ({r.cumplimiento.enRiesgo.length})
        </h3>
        {r.cumplimiento.enRiesgo.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nadie tiene evidencias atrasadas ni causal de deserción.</p>
        ) : (
          <Tabla encabezados={["Aprendiz", "Ficha", "Instructor", "Evidencias atrasadas", "Causal de deserción"]}>
            {r.cumplimiento.enRiesgo.map((a) => (
              <tr key={a.id}>
                <td className={td}>
                  <Link href={`/formulario/expediente/${a.id}`} className="underline print:no-underline">
                    {a.nombre}
                  </Link>
                </td>
                <td className={td}>{a.ficha ?? "—"}</td>
                <td className={td}>{a.instructor ?? "—"}</td>
                <td className={td}>{a.atrasadas.length ? a.atrasadas.join(" · ") : "—"}</td>
                <td className={td}>{a.causaDesercion ?? "—"}</td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      <Seccion titulo="Listado de aprendices" descripcion="Una fila por aprendiz con su avance en la Etapa Productiva.">
        {r.listado.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ningún aprendiz cumple los filtros.</p>
        ) : (
          <Tabla
            encabezados={[
              "Aprendiz",
              "Documento",
              "Ficha",
              "Empresa",
              "Instructor",
              "Estado",
              "Inicio EP",
              "Fin EP",
              "Bitácoras",
              "Momento 1",
              "Momento 2",
              "Momento 3",
              "Certificación",
            ]}
          >
            {r.listado.map((a) => (
              <tr key={a.id}>
                <td className={td}>
                  <Link href={`/formulario/expediente/${a.id}`} className="underline print:no-underline">
                    {a.nombre}
                  </Link>
                </td>
                <td className={td}>{a.documento}</td>
                <td className={td}>{a.ficha ?? "—"}</td>
                <td className={td}>{a.empresa ?? "—"}</td>
                <td className={td}>{a.instructor ?? "—"}</td>
                <td className={td}>{a.estado}</td>
                <td className={td}>{dia(a.inicioEP)}</td>
                <td className={td}>{dia(a.finEP)}</td>
                <td className={td}>
                  {a.bitacorasAprobadas} de {a.totalBitacoras}
                </td>
                <td className={td}>{a.momento1}</td>
                <td className={td}>{a.momento2}</td>
                <td className={td}>{a.momento3}</td>
                <td className={td}>{a.certificacion}</td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>
    </div>
  );
}
