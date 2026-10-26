import Link from "next/link";
import type { Reporte } from "@/lib/reportes";
import { filtrosAQuery, describirFiltros } from "@/lib/reportes";
import type { construirInformeInstructores } from "@/lib/informe-instructores";
import {
  lecturaAlDia,
  lecturaBitacorasATiempo,
  lecturaBitacorasAprobadas,
  lecturaConteoAlerta,
  lecturaEnRiesgo,
  lecturaJuicio,
  lecturaNovedades,
  lecturaPlanes,
  lecturaRubrica,
  lecturaSinAnotar,
  type Lectura,
} from "@/lib/lectura-indicadores";
import { LecturaLinea } from "@/components/panorama-aprendices";
import { ImprimirBoton } from "@/components/imprimir-boton";

// Tablero de Coordinación de Formación (26 oct 2026): la ejecución de la etapa productiva de un
// vistazo y de manera gerencial. No calcula nada propio: todo sale de `construirReporte` (los mismos
// números de Reportes) y del informe de instructores, así que las dos vistas nunca se contradicen.
// Cada bloque responde una pregunta y trae su lectura en palabras.

type Informe = Awaited<ReturnType<typeof construirInformeInstructores>>;

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte * 100) / total) : null);
const fmtPct = (p: number | null) => (p === null ? "—" : `${p} %`);

const GRUPOS = [
  { clave: "alDia", etiqueta: "Al día", ayuda: "En práctica, sin nada vencido", color: "bg-[#0ca30c]" },
  { clave: "enRiesgo", etiqueta: "Requieren atención", ayuda: "Algo vencido o señal de deserción", color: "bg-[#d03b3b]" },
  { clave: "porCertificar", etiqueta: "Por certificar", ayuda: "Seis evidencias completas", color: "bg-sky-500" },
  { clave: "certificados", etiqueta: "Certificados", ayuda: "Terminaron el proceso", color: "bg-azul dark:bg-sky-300" },
  { clave: "enPausa", etiqueta: "En pausa o retirados", ayuda: "Interrumpida, aplazada o desertó", color: "bg-zinc-300 dark:bg-zinc-600" },
] as const;

const TRAMO = {
  completa: { etiqueta: "Completa", color: "bg-[#0ca30c]" },
  proxima: { etiqueta: "Vence pronto", color: "bg-[#fab219]" },
  atrasada: { etiqueta: "Atrasada", color: "bg-[#d03b3b]" },
  pendiente: { etiqueta: "Aún no le toca", color: "bg-zinc-300 dark:bg-zinc-600" },
} as const;

export function TableroFormacion({ r, informe }: { r: Reporte; informe: Informe }) {
  const m = r.metricas;
  const s = m.semaforo;
  const total = m.aprendices;
  const enPractica = s.alDia + s.enRiesgo;
  const terminaron = s.porCertificar + s.certificados;
  const query = filtrosAQuery(r.filtros);
  const filtrado = Boolean(query);

  return (
    <div className="flex flex-col gap-8 print:gap-5 print:text-black">
      <Encabezado r={r} filtrado={filtrado} />
      <Filtros r={r} filtrado={filtrado} />

      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay aprendices con estos filtros.
        </p>
      ) : (
        <>
          <Pulso s={s} total={total} enPractica={enPractica} terminaron={terminaron} />
          <Recorrido r={r} total={total} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Calidad r={r} />
            <Oportunidad r={r} />
          </div>
          <Acompanamiento r={r} informe={informe} filtrado={filtrado} />
          <PorGrupo r={r} />
          <Atencion r={r} query={query} />
        </>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Cifras calculadas en el momento con los registros de SEPA. Las lecturas (✓ bien, ! revisar, ! pide acción)
        usan umbrales de referencia para interpretar, no reglas de la guía.
      </p>
    </div>
  );
}

// ---- Encabezado y filtros -------------------------------------------------------------------

function Encabezado({ r, filtrado }: { r: Reporte; filtrado: boolean }) {
  const corte = r.generado.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
          Coordinación de Formación
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900 [text-wrap:balance] dark:text-zinc-50 sm:text-3xl">
          Tablero de la Etapa Productiva
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Corte al {corte} · {filtrado ? describirFiltros(r) : "Todo el centro"}
        </p>
      </div>
      <ImprimirBoton />
    </header>
  );
}

function Filtros({ r, filtrado }: { r: Reporte; filtrado: boolean }) {
  const f = r.filtros;
  const campo =
    "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 print:hidden"
    >
      <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        Programa
        <select name="programa" defaultValue={f.programa} className={`${campo} max-w-72`}>
          <option value="">Todos los programas</option>
          {r.opciones.programas.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
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
        Ver indicadores
      </button>
      {filtrado && (
        <Link href="/formulario/formacion" className="px-2 py-1.5 text-sm text-zinc-600 underline dark:text-zinc-400">
          Todo el centro
        </Link>
      )}
    </form>
  );
}

// ---- Bloques --------------------------------------------------------------------------------

function Bloque({
  pregunta,
  titulo,
  children,
  accion,
}: {
  pregunta: string;
  titulo: string;
  children: React.ReactNode;
  accion?: { href: string; texto: string };
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:break-inside-avoid print:border-zinc-300">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{pregunta}</p>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{titulo}</h2>
        </div>
        {accion && (
          <Link href={accion.href} className="text-sm font-medium text-azul underline dark:text-sky-300 print:hidden">
            {accion.texto}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// 1. ¿Cómo van los aprendices? Una franja que suma el total y cinco cifras.
function Pulso({
  s,
  total,
  enPractica,
  terminaron,
}: {
  s: Reporte["metricas"]["semaforo"];
  total: number;
  enPractica: number;
  terminaron: number;
}) {
  const frase =
    enPractica > 0
      ? `De ${total} aprendices acompañados, ${enPractica} están en práctica: ${s.alDia} van al día y ${s.enRiesgo} requieren atención.${terminaron ? ` ${terminaron} ya ${terminaron === 1 ? "completó" : "completaron"} sus seis evidencias.` : ""}`
      : `${total} aprendices acompañados; ninguno en práctica activa en este momento.`;
  return (
    <Bloque pregunta="¿Cómo van los aprendices?" titulo="El pulso de la etapa productiva">
      <p className="max-w-3xl text-lg leading-snug text-zinc-800 [text-wrap:pretty] dark:text-zinc-100">{frase}</p>

      <div className="flex flex-col gap-2">
        <div
          role="img"
          aria-label={GRUPOS.map((g) => `${g.etiqueta}: ${s[g.clave]}`).join(", ")}
          className="flex h-5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          {GRUPOS.map((g) =>
            s[g.clave] ? (
              <span
                key={g.clave}
                title={`${g.etiqueta}: ${s[g.clave]}`}
                className={`h-full print:[print-color-adjust:exact] ${g.color}`}
                style={{ width: `${(s[g.clave] * 100) / total}%` }}
              />
            ) : null,
          )}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Cada aprendiz está en un solo grupo: la franja suma el 100 %.</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {GRUPOS.map((g) => (
          <div key={g.clave} className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full print:[print-color-adjust:exact] ${g.color}`} />
              {g.etiqueta}
            </dt>
            <dd className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{s[g.clave]}</span>
              <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{fmtPct(pct(s[g.clave], total))}</span>
            </dd>
            <dd className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">{g.ayuda}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1.5">
        <LecturaLinea lectura={lecturaAlDia(s.alDia, enPractica)} />
        <LecturaLinea lectura={lecturaEnRiesgo(s.enRiesgo, enPractica)} />
      </div>
    </Bloque>
  );
}

// 2. ¿Dónde se atasca el proceso? Las seis evidencias en su orden, con la que más atrasos acumula.
function Recorrido({ r, total }: { r: Reporte; total: number }) {
  const evidencias = r.cumplimiento.porEvidencia;
  const peor = evidencias.reduce((a, b) => (b.atrasada > a.atrasada ? b : a), evidencias[0]);
  const cuello = peor && peor.atrasada > 0 ? peor.clave : null;
  return (
    <Bloque pregunta="¿Dónde se atasca el proceso?" titulo="Recorrido de las seis evidencias">
      <ol className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {/* La línea que une las seis estaciones, solo cuando caben en una fila. */}
        <span aria-hidden className="absolute left-0 right-0 top-[18px] hidden h-0.5 bg-zinc-200 dark:bg-zinc-700 lg:block" />
        {evidencias.map((e, i) => {
          const completa = pct(e.completa, total) ?? 0;
          const esCuello = e.clave === cuello;
          return (
            <li key={e.clave} className="relative flex flex-col gap-2">
              <span
                className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-bold tabular-nums ${
                  esCuello
                    ? "border-[#d03b3b] bg-[#d03b3b] text-white"
                    : "border-emerald-600 bg-white text-emerald-700 dark:bg-zinc-900 dark:text-emerald-400"
                } print:[print-color-adjust:exact]`}
              >
                {i + 1}
              </span>
              <div
                className={`flex flex-1 flex-col gap-2 rounded-xl border p-3 ${
                  esCuello ? "border-red-300 dark:border-red-900/70" : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <p className="text-sm font-medium leading-tight text-zinc-800 dark:text-zinc-100">{e.etiqueta}</p>
                <p className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{completa} %</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">completa</span>
                </p>
                <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  {(Object.keys(TRAMO) as (keyof typeof TRAMO)[]).map((k) =>
                    e[k] ? (
                      <span
                        key={k}
                        className={`h-full print:[print-color-adjust:exact] ${TRAMO[k].color}`}
                        style={{ width: `${(e[k] * 100) / total}%` }}
                      />
                    ) : null,
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {e.atrasada > 0 ? (
                    <span className="font-semibold text-red-700 dark:text-red-400">
                      {e.atrasada} atrasada{e.atrasada === 1 ? "" : "s"}
                    </span>
                  ) : (
                    "Sin atrasos"
                  )}
                  {e.proxima > 0 && ` · ${e.proxima} vence${e.proxima === 1 ? "" : "n"} pronto`}
                </p>
                {esCuello && (
                  <span className="w-fit rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
                    Donde más se atrasa
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        {(Object.keys(TRAMO) as (keyof typeof TRAMO)[]).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span aria-hidden className={`h-2 w-2 rounded-full print:[print-color-adjust:exact] ${TRAMO[k].color}`} />
            {TRAMO[k].etiqueta}
          </li>
        ))}
      </ul>
    </Bloque>
  );
}

// Una cifra con su barra, qué mide y su lectura.
function Indicador({
  nombre,
  valor,
  detalle,
  porcentaje,
  mide,
  lectura,
}: {
  nombre: string;
  valor: string;
  detalle?: string;
  porcentaje?: number | null;
  mide: string;
  lectura: Lectura;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{nombre}</p>
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{valor}</span>
          {detalle && <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{detalle}</span>}
        </p>
      </div>
      {porcentaje !== undefined && porcentaje !== null && (
        <span aria-hidden className="block h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <span
            className="block h-full rounded-full bg-emerald-600 print:[print-color-adjust:exact]"
            style={{ width: `${porcentaje}%` }}
          />
        </span>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{mide}</p>
      <LecturaLinea lectura={lectura} />
    </div>
  );
}

// 3. ¿Qué tan bien se están formando? Rúbrica, juicio del cierre y planes de mejoramiento.
function Calidad({ r }: { r: Reporte }) {
  const { rubrica, momento3, planesMejoramiento: pm } = r.metricas;
  const satisfactorio = pct(rubrica.satisfactorio, rubrica.valoradas);
  return (
    <Bloque pregunta="¿Qué tan bien se están formando?" titulo="Calidad de la formación">
      <Indicador
        nombre="Criterios en «Satisfactorio»"
        valor={fmtPct(satisfactorio)}
        detalle={rubrica.valoradas ? `${rubrica.satisfactorio} de ${rubrica.valoradas}` : undefined}
        porcentaje={satisfactorio}
        mide="De los 13 criterios que el instructor valora en los Momentos 2 y 3 (formato GFPI-F-023)."
        lectura={lecturaRubrica(rubrica.satisfactorio, rubrica.valoradas)}
      />
      <Indicador
        nombre="Juicio del cierre (Momento 3)"
        valor={`${momento3.aprobados}`}
        detalle={`aprobados · ${momento3.noAprobados} no aprobados`}
        mide="Juicio final que registra el instructor al cerrar la etapa productiva."
        lectura={lecturaJuicio(momento3.aprobados, momento3.noAprobados)}
      />
      <Indicador
        nombre="Planes de mejoramiento"
        valor={`${pm.total}`}
        detalle={`${pm.abiertos} abiertos · ${pm.vencidos} vencidos · ${pm.noCumplidos} no cumplidos`}
        mide="Medida formativa del reglamento (Acuerdo 009) cuando no se superan resultados de aprendizaje."
        lectura={lecturaPlanes(pm.total, pm.abiertos, pm.noCumplidos)}
      />
    </Bloque>
  );
}

// 4. ¿Se cumple a tiempo? Bitácoras y novedades frente a sus plazos.
function Oportunidad({ r }: { r: Reporte }) {
  const { bitacoras: b, novedades: n } = r.metricas;
  const aTiempo = pct(b.aTiempo, b.entregadas);
  const enPlazo = pct(n.total - n.fueraDePlazo, n.total);
  return (
    <Bloque pregunta="¿Se cumple a tiempo?" titulo="Oportunidad y cumplimiento">
      <Indicador
        nombre="Bitácoras entregadas a tiempo"
        valor={fmtPct(aTiempo)}
        detalle={b.entregadas ? `${b.aTiempo} de ${b.entregadas}` : undefined}
        porcentaje={aTiempo}
        mide="Entregadas a más tardar en su fecha límite (una por mes, formato GFPI-F-147)."
        lectura={lecturaBitacorasATiempo(b.aTiempo, b.entregadas)}
      />
      <Indicador
        nombre="Bitácoras avaladas"
        valor={fmtPct(pct(b.aprobadas, b.entregadas))}
        detalle={b.entregadas ? `${b.aprobadas} de ${b.entregadas}` : undefined}
        porcentaje={pct(b.aprobadas, b.entregadas)}
        mide="Entregadas que el instructor ya revisó y avaló."
        lectura={lecturaBitacorasAprobadas(b.aprobadas, b.entregadas)}
      />
      <Indicador
        nombre="Novedades registradas en plazo"
        valor={fmtPct(enPlazo)}
        detalle={n.total ? `${n.total - n.fueraDePlazo} de ${n.total}` : undefined}
        porcentaje={enPlazo}
        mide="Registradas dentro de los 3 días hábiles que pide la guía (§9.2), incluidas interrupciones y aplazamientos."
        lectura={lecturaNovedades(n.total, n.fueraDePlazo)}
      />
      <Indicador
        nombre="Novedades sin anotar en la bitácora"
        valor={`${n.sinAnotarEnBitacora}`}
        mide="La guía pide dejar constancia de cada novedad en la bitácora del aprendiz."
        lectura={lecturaSinAnotar(n.sinAnotarEnBitacora, n.total)}
      />
    </Bloque>
  );
}

// 5. ¿Cómo acompañan los instructores? Siempre de todo el centro: es la capacidad institucional.
function Acompanamiento({ r, informe, filtrado }: { r: Reporte; informe: Informe; filtrado: boolean }) {
  const c = informe.centro;
  const revisadas = informe.instructores.reduce((s, i) => s + i.respuesta.revisadas, 0);
  const promedio = revisadas
    ? Math.round(
        (informe.instructores.reduce((s, i) => s + (i.respuesta.promedioDias ?? 0) * i.respuesta.revisadas, 0) / revisadas) * 10,
      ) / 10
    : null;
  const valorados = pct(c.momentosValorados, c.momentosRealizados);
  const { instructoresSobreTope, plazo24Meses } = r.metricas.alertas;

  const cifras: { nombre: string; valor: string; mide: string }[] = [
    { nombre: "Instructores con aprendices", valor: `${c.instructores}`, mide: "Con al menos una ficha y aprendices asignados." },
    { nombre: "Entregas esperando revisión", valor: `${c.pendientes}`, mide: "Evidencias enviadas que aún no se avalan o rechazan." },
    {
      nombre: `Más de ${informe.plazoRevision} días hábiles`,
      valor: `${c.demoradas}`,
      mide: "De las que esperan revisión, las que pasan el plazo de aval de la guía.",
    },
    {
      nombre: "Tiempo de respuesta",
      valor: promedio === null ? "—" : `${promedio.toLocaleString("es-CO")} d`,
      mide: "Promedio en días hábiles desde la entrega hasta la revisión.",
    },
    {
      nombre: "Momentos ya valorados",
      valor: fmtPct(valorados),
      mide: `${c.momentosValorados} de ${c.momentosRealizados} reuniones realizadas ya tienen su valoración.`,
    },
  ];

  return (
    <Bloque
      pregunta="¿Cómo acompañan los instructores?"
      titulo={`Acompañamiento de los instructores${filtrado ? " · todo el centro" : ""}`}
      accion={{ href: "/formulario/reportes/instructores", texto: "Ver por instructor" }}
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cifras.map((x) => (
          <div key={x.nombre} className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{x.nombre}</dt>
            <dd className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{x.valor}</dd>
            <dd className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">{x.mide}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-1.5">
        <LecturaLinea
          lectura={lecturaConteoAlerta(
            c.demoradas,
            `Ninguna entrega pasa de ${informe.plazoRevision} días hábiles esperando revisión.`,
            `${c.demoradas} ${c.demoradas === 1 ? "entrega lleva" : "entregas llevan"} más de ${informe.plazoRevision} días hábiles sin revisar: conviene apoyar a esos instructores.`,
          )}
        />
        <LecturaLinea
          lectura={lecturaConteoAlerta(
            instructoresSobreTope,
            "Ningún instructor supera el tope de 80 aprendices activos (§9.1.3).",
            `${instructoresSobreTope} ${instructoresSobreTope === 1 ? "instructor supera" : "instructores superan"} el tope de 80 aprendices activos (§9.1.3).`,
          )}
        />
        <LecturaLinea
          lectura={lecturaConteoAlerta(
            plazo24Meses,
            "Ningún aprendiz está en riesgo de pasar el plazo de 24 meses (Acuerdo 007).",
            `${plazo24Meses} ${plazo24Meses === 1 ? "aprendiz está" : "aprendices están"} en riesgo de pasar el plazo de 24 meses para culminar (Acuerdo 007).`,
          )}
        />
      </div>
    </Bloque>
  );
}

// 6. ¿Dónde hay que poner el foco? Por programa (o por ficha, cuando ya se eligió un programa).
function PorGrupo({ r }: { r: Reporte }) {
  const porFicha = Boolean(r.filtros.programa || r.filtros.ficha);
  const grupos = [...(porFicha ? r.consolidado.porFicha : r.consolidado.porPrograma)].sort(
    (a, b) => b.conAtrasos / Math.max(1, b.aprendices) - a.conAtrasos / Math.max(1, a.aprendices) || b.aprendices - a.aprendices,
  );
  return (
    <Bloque
      pregunta="¿Dónde hay que poner el foco?"
      titulo={porFicha ? "Por ficha" : "Por programa de formación"}
      accion={{ href: `/formulario/reportes${porFicha ? "#por-ficha" : "#por-programa"}`, texto: "Ver el consolidado completo" }}
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Primero {porFicha ? "las fichas" : "los programas"} con más aprendices atrasados en proporción.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-2 pr-3 font-medium">{porFicha ? "Ficha" : "Programa"}</th>
              <th className="py-2 pr-3 text-right font-medium">Aprendices</th>
              <th className="w-[22%] py-2 pr-3 font-medium">Con atrasos</th>
              <th className="w-[22%] py-2 pr-3 font-medium">Bitácoras avaladas</th>
              <th className="py-2 pr-3 text-right font-medium">Satisfactorio</th>
              <th className="py-2 text-right font-medium">Terminaron</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const atrasos = pct(g.conAtrasos, g.aprendices) ?? 0;
              const bitacoras = pct(g.bitacorasAprobadas, g.bitacorasPrevistas) ?? 0;
              return (
                <tr key={g.clave} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70">
                  <td className="py-2 pr-3 font-medium text-zinc-800 dark:text-zinc-100">{g.etiqueta}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{g.aprendices}</td>
                  <td className="py-2 pr-3">
                    <Barra porcentaje={atrasos} color="bg-[#d03b3b]" texto={`${g.conAtrasos} · ${atrasos} %`} />
                  </td>
                  <td className="py-2 pr-3">
                    <Barra
                      porcentaje={bitacoras}
                      color="bg-[#0ca30c]"
                      texto={`${g.bitacorasAprobadas}/${g.bitacorasPrevistas} · ${bitacoras} %`}
                    />
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtPct(pct(g.rubricaSatisfactorio, g.rubricaValoradas))}</td>
                  <td className="py-2 text-right tabular-nums">{g.porCertificar + g.certificados}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Bloque>
  );
}

function Barra({ porcentaje, color, texto }: { porcentaje: number; color: string; texto: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="block h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <span className={`block h-full rounded-full print:[print-color-adjust:exact] ${color}`} style={{ width: `${porcentaje}%` }} />
      </span>
      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-zinc-600 dark:text-zinc-300">{texto}</span>
    </div>
  );
}

// 7. ¿Quiénes requieren atención? Los primeros de la lista, con lo que les falta y su expediente.
const MAXIMO_ATENCION = 8;

function Atencion({ r, query }: { r: Reporte; query: string }) {
  const lista = r.cumplimiento.enRiesgo;
  return (
    <Bloque
      pregunta="¿A quién hay que contactar primero?"
      titulo={`Quiénes requieren atención (${lista.length})`}
      accion={
        lista.length > MAXIMO_ATENCION
          ? { href: `/formulario/reportes${query ? `?${query}` : ""}#necesitan-atencion`, texto: `Ver los ${lista.length}` }
          : undefined
      }
    >
      {lista.length === 0 ? (
        <LecturaLinea lectura={{ texto: "Nadie tiene entregas vencidas ni señales de deserción.", tono: "bien" }} />
      ) : (
        <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Primero quien tiene más evidencias atrasadas. Para actuar, coordina con su instructor o con Coordinación de
            Etapa Productiva.
          </p>
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {lista.slice(0, MAXIMO_ATENCION).map((a) => (
              <li key={a.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`/formulario/expediente/${a.id}`}
                    className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600 dark:text-zinc-50 print:no-underline"
                  >
                    {a.nombre}
                  </Link>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ficha {a.ficha ?? "sin asignar"} · {a.instructor ?? "Sin instructor"}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {a.atrasadas.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-300"
                    >
                      {t}
                    </span>
                  ))}
                  {a.causaDesercion && (
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-300">
                      Señal de deserción: {a.causaDesercion}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Bloque>
  );
}
