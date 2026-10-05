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

function Seccion({
  titulo,
  descripcion,
  id,
  children,
}: {
  titulo: string;
  descripcion: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:rounded-none print:border-zinc-300 print:p-3">
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

// Colores de estado (fijos, nunca de serie): siempre van con su ícono y su etiqueta, así que el
// color nunca es lo único que dice el estado.
const ESTADOS_CUMPLIMIENTO = [
  { clave: "completa", etiqueta: "Completa", icono: "✓", clase: "bg-[#0ca30c]" },
  { clave: "proxima", etiqueta: "Próxima a vencer", icono: "◷", clase: "bg-[#fab219]" },
  { clave: "atrasada", etiqueta: "Atrasada", icono: "!", clase: "bg-[#d03b3b]" },
  { clave: "pendiente", etiqueta: "Pendiente", icono: "·", clase: "bg-zinc-300 dark:bg-zinc-600" },
] as const;

// Indicador principal: número grande y una línea que lo explica. `tono` marca solo lo que pide
// atención, con ícono y no solo color.
function Indicador({
  etiqueta,
  valor,
  detalle,
  alerta = false,
}: {
  etiqueta: string;
  valor: string | number;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 print:border-zinc-300 ${
        alerta
          ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {alerta && (
          <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            !
          </span>
        )}
        {etiqueta}
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{valor}</p>
      {detalle && <p className="text-xs text-zinc-500 dark:text-zinc-400">{detalle}</p>}
    </div>
  );
}

// Barras horizontales de un solo tono (magnitud por categoría), con el valor al final.
function BarrasEstado({ filas, total }: { filas: { etiqueta: string; cantidad: number }[]; total: number }) {
  const maximo = Math.max(1, ...filas.map((f) => f.cantidad));
  return (
    <ul className="flex flex-col gap-1.5">
      {filas.map((f) => (
        <li
          key={f.etiqueta}
          className="grid grid-cols-[9rem_1fr] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr]"
          title={`${f.etiqueta}: ${f.cantidad} (${porcentaje(f.cantidad, total)})`}
        >
          <span className="truncate text-zinc-600 dark:text-zinc-300">{f.etiqueta}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-3 rounded-r-[4px] bg-azul dark:bg-sky-400 print:bg-zinc-700"
              style={{ width: `${(f.cantidad / maximo) * 75}%`, minWidth: f.cantidad ? 4 : 0 }}
            />
            <span className="whitespace-nowrap text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
              {f.cantidad}
              {total > 0 && f.cantidad > 0 && (
                <span className="text-zinc-400 dark:text-zinc-500"> · {porcentaje(f.cantidad, total)}</span>
              )}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Una barra 100 % apilada por evidencia, con el hueco del fondo entre tramos.
function BarraCumplimiento({ fila }: { fila: Record<string, number | string> }) {
  const total = ESTADOS_CUMPLIMIENTO.reduce((s, e) => s + Number(fila[e.clave] ?? 0), 0);
  if (total === 0) return <span className="text-xs text-zinc-400">Sin aprendices</span>;
  return (
    <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-[4px]">
      {ESTADOS_CUMPLIMIENTO.map((e) => {
        const n = Number(fila[e.clave] ?? 0);
        if (!n) return null;
        return (
          <span
            key={e.clave}
            title={`${e.etiqueta}: ${n} de ${total} (${porcentaje(n, total)})`}
            className={`h-full print:[print-color-adjust:exact] ${e.clase}`}
            style={{ width: `${(n / total) * 100}%` }}
          />
        );
      })}
    </div>
  );
}

function LeyendaCumplimiento() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
      {ESTADOS_CUMPLIMIENTO.map((e) => (
        <li key={e.clave} className="flex items-center gap-1.5">
          <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${e.clase}`} />
          <span aria-hidden className="font-semibold">{e.icono}</span>
          {e.etiqueta}
        </li>
      ))}
    </ul>
  );
}

type FilaConsolidado = {
  clave: string;
  etiqueta: string;
  aprendices: number;
  conAtrasos: number;
  porCertificar: number;
  certificados: number;
  bitacorasAprobadas: number;
  bitacorasPrevistas: number;
  rubricaSatisfactorio: number;
  rubricaValoradas: number;
  momento3Aprobados: number;
  momento3NoAprobados: number;
  novedades: number;
  novedadesFueraDePlazo: number;
  planesAbiertos: number;
};

function TablaConsolidado({ filas, primera }: { filas: FilaConsolidado[]; primera: string }) {
  return (
    <Tabla
      encabezados={[
        primera,
        "Aprendices",
        "Con atrasos",
        "Por certificar",
        "Certificados",
        "Bitácoras aprobadas",
        "Rúbrica satisfactoria",
        "Momento 3",
        "Novedades",
        "Planes abiertos",
      ]}
    >
      {filas.map((f) => (
        <tr key={f.clave} className={f.conAtrasos > 0 ? "bg-amber-50/50 dark:bg-amber-950/20" : undefined}>
          <td className={`${td} font-medium`}>{f.etiqueta}</td>
          <td className={td}>{f.aprendices}</td>
          <td className={td}>
            {f.conAtrasos}
            {f.conAtrasos > 0 && (
              <span className="text-amber-700 dark:text-amber-400">
                {" "}
                ({porcentaje(f.conAtrasos, f.aprendices)})
              </span>
            )}
          </td>
          <td className={td}>{f.porCertificar}</td>
          <td className={td}>{f.certificados}</td>
          <td className={td}>
            <span className="whitespace-nowrap">
              {f.bitacorasAprobadas} de {f.bitacorasPrevistas}
              {f.bitacorasPrevistas > 0 && ` · ${porcentaje(f.bitacorasAprobadas, f.bitacorasPrevistas)}`}
            </span>
            {f.bitacorasPrevistas > 0 && (
              <span aria-hidden className="mt-1 block h-1.5 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <span
                  className="block h-full rounded-full bg-sena"
                  style={{ width: `${Math.min(100, (f.bitacorasAprobadas / f.bitacorasPrevistas) * 100)}%` }}
                />
              </span>
            )}
          </td>
          <td className={td}>
            {f.rubricaValoradas === 0
              ? "—"
              : `${porcentaje(f.rubricaSatisfactorio, f.rubricaValoradas)} de ${f.rubricaValoradas}`}
          </td>
          <td className={td}>
            {f.momento3Aprobados + f.momento3NoAprobados === 0
              ? "—"
              : `${f.momento3Aprobados} aprobados · ${f.momento3NoAprobados} no aprobados`}
          </td>
          <td className={td}>
            {f.novedades}
            {f.novedadesFueraDePlazo > 0 && (
              <span className="text-amber-700 dark:text-amber-400"> · {f.novedadesFueraDePlazo} fuera de plazo</span>
            )}
          </td>
          <td className={td}>{f.planesAbiertos}</td>
        </tr>
      ))}
    </Tabla>
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
          className="rounded-md bg-sena px-4 py-1.5 text-sm font-medium text-white hover:bg-sena-oscuro dark:bg-sena dark:text-white"
        >
          Aplicar filtros
        </button>
        {hayFiltros && (
          <Link href="/formulario/reportes" className="px-2 py-1.5 text-sm text-zinc-600 underline dark:text-zinc-400">
            Quitar filtros
          </Link>
        )}
      </form>

      <nav aria-label="Secciones del reporte" className="flex flex-wrap gap-1 text-sm print:hidden">
        {[
          ["#resumen", "Resumen"],
          ["#cumplimiento", "Cumplimiento"],
          ["#por-ficha", "Por ficha"],
          ["#por-programa", "Por programa"],
          ["#listado", "Listado"],
        ].map(([href, texto]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-700 hover:border-sena hover:text-azul dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {texto}
          </a>
        ))}
      </nav>

      <div id="resumen" className="grid scroll-mt-4 grid-cols-2 gap-2 lg:grid-cols-4">
        <Indicador etiqueta="Aprendices" valor={m.aprendices} detalle={describirFiltros(r)} />
        <Indicador
          etiqueta="Al día"
          valor={porcentaje(m.aprendices - r.cumplimiento.enRiesgo.length, m.aprendices)}
          detalle={`${m.aprendices - r.cumplimiento.enRiesgo.length} sin evidencias atrasadas`}
        />
        <Indicador
          etiqueta="En riesgo"
          valor={r.cumplimiento.enRiesgo.length}
          detalle="Evidencias atrasadas o causal de deserción"
          alerta={r.cumplimiento.enRiesgo.length > 0}
        />
        <Indicador
          etiqueta="Certificados"
          valor={m.porEstado.find((e) => e.estado === "CERTIFICADO")?.cantidad ?? 0}
          detalle={`${m.porEstado.find((e) => e.estado === "POR_CERTIFICAR")?.cantidad ?? 0} más por certificar`}
        />
      </div>

      <Seccion titulo="Métricas" descripcion="Totales de los aprendices que cumplen los filtros.">
        <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Aprendices por estado</h3>
        <BarrasEstado filas={m.porEstado} total={m.aprendices} />
        <h3 className="mb-2 mt-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Evidencias y evaluación</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        <h3 className="mb-2 mt-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Novedades, planes y alertas</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Cifra
            etiqueta="Novedades registradas"
            valor={m.novedades.total}
            detalle={`${porcentaje(m.novedades.total - m.novedades.fueraDePlazo, m.novedades.total)} dentro de los 3 días hábiles`}
          />
          <Cifra
            etiqueta="Novedades sin anotar en bitácora"
            valor={m.novedades.sinAnotarEnBitacora}
            detalle="Plazo de 5 días hábiles"
          />
          <Cifra
            etiqueta="Planes de mejoramiento"
            valor={m.planesMejoramiento.total}
            detalle={`${m.planesMejoramiento.abiertos} sin cerrar · ${m.planesMejoramiento.noCumplidos} no cumplidos`}
          />
          <Cifra
            etiqueta="Planes con plazo vencido"
            valor={m.planesMejoramiento.vencidos}
            detalle="Máximo 20 días calendario · solo advertencia"
          />
          <Cifra
            etiqueta="Aprendices fuera del plazo de 24 meses"
            valor={m.alertas.plazo24Meses}
            detalle="Acuerdo 007 de 2012 · solo advertencia"
          />
          <Cifra
            etiqueta="Instructores sobre el tope"
            valor={m.alertas.instructoresSobreTope}
            detalle="Más de 80 aprendices activos · todo el centro"
          />
        </div>
      </Seccion>

      <Seccion
        id="cumplimiento"
        titulo="Cumplimiento"
        descripcion="Cómo va cada evidencia en conjunto, y quiénes tienen evidencias atrasadas o causal de deserción."
      >
        <div className="mb-4 flex flex-col gap-3">
          <LeyendaCumplimiento />
          <ul className="flex flex-col gap-2">
            {r.cumplimiento.porEvidencia.map((e) => (
              <li key={e.clave} className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[12rem_1fr] sm:gap-3">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {e.etiqueta}
                  {e.atrasada > 0 && (
                    <span className="ml-2 text-xs font-semibold text-red-700 dark:text-red-400">! {e.atrasada} atrasada{e.atrasada === 1 ? "" : "s"}</span>
                  )}
                </span>
                <BarraCumplimiento fila={e} />
              </li>
            ))}
          </ul>
        </div>
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

      <Seccion
        id="por-ficha"
        titulo="Consolidado por ficha"
        descripcion="Las mismas cifras, cortadas por ficha: dónde se concentran los atrasos y cómo va cada grupo."
      >
        {r.consolidado.porFicha.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ningún aprendiz cumple los filtros.</p>
        ) : (
          <TablaConsolidado filas={r.consolidado.porFicha} primera="Ficha" />
        )}
      </Seccion>

      <Seccion
        id="por-programa"
        titulo="Consolidado por programa de formación"
        descripcion="El mismo corte, agrupando todas las fichas de cada programa."
      >
        {r.consolidado.porPrograma.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ningún aprendiz cumple los filtros.</p>
        ) : (
          <TablaConsolidado filas={r.consolidado.porPrograma} primera="Programa" />
        )}
      </Seccion>

      <Seccion id="listado"
        titulo="Listado de aprendices" descripcion="Una fila por aprendiz con su avance en la Etapa Productiva.">
        {r.listado.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Ningún aprendiz cumple los filtros.</p>
        ) : (
          <Tabla
            encabezados={[
              "Aprendiz",
              "Documento",
              "Ficha",
              "Empresa",
              "NIT",
              "Instructor",
              "Estado",
              "Inicio EP",
              "Fin EP",
              "Bitácoras",
              "Novedades",
              "Planes de mejoramiento",
              "Alertas",
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
                <td className={`${td} whitespace-nowrap tabular-nums`}>{a.nit ?? "—"}</td>
                <td className={td}>{a.instructor ?? "—"}</td>
                <td className={td}>{a.estado}</td>
                <td className={td}>{dia(a.inicioEP)}</td>
                <td className={td}>{dia(a.finEP)}</td>
                <td className={td}>
                  {a.bitacorasAprobadas} de {a.totalBitacoras}
                </td>
                <td className={td}>
                  {a.novedades}
                  {a.novedadesFueraDePlazo > 0 && (
                    <span className="text-amber-700 dark:text-amber-400"> · {a.novedadesFueraDePlazo} fuera de plazo</span>
                  )}
                  {a.novedadesSinAnotar > 0 && (
                    <span className="text-zinc-500 dark:text-zinc-400"> · {a.novedadesSinAnotar} sin anotar</span>
                  )}
                </td>
                <td className={td}>
                  {a.planesMejoramiento === 0 ? (
                    "—"
                  ) : (
                    <>
                      {a.planesMejoramiento}
                      {a.planesAbiertos > 0 && (
                        <span className="text-amber-700 dark:text-amber-400"> · {a.planesAbiertos} sin cerrar</span>
                      )}
                      {a.planesNoCumplidos > 0 && (
                        <span className="text-red-700 dark:text-red-400"> · {a.planesNoCumplidos} no cumplidos</span>
                      )}
                    </>
                  )}
                </td>
                <td className={td}>
                  {a.advertenciaPlazo ? (
                    <span title={a.advertenciaPlazo} className="text-amber-700 dark:text-amber-400">
                      Plazo de 24 meses
                    </span>
                  ) : (
                    "—"
                  )}
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
