import {
  deCadaDiez,
  lecturaAlDia,
  lecturaCertificados,
  lecturaEnRiesgo,
  type Lectura,
  type Tono,
} from "@/lib/lectura-indicadores";

// Panorama de los aprendices para Reportes, pensado para explicarlo en una reunión (pedido de
// Coordinación, 9 oct 2026): una frase que lo resume, un cuadro por aprendiz coloreado por cómo
// va, y cuatro tarjetas que dicen qué significa cada número y cómo leerlo. Cada aprendiz cae en
// UN solo grupo, así que los números siempre suman el total.

export type Semaforo = { alDia: number; enRiesgo: number; porCertificar: number; certificados: number; enPausa: number };

const TONO: Record<Tono, { icono: string; clase: string }> = {
  bien: { icono: "✓", clase: "text-emerald-800 dark:text-emerald-300" },
  regular: { icono: "!", clase: "text-amber-800 dark:text-amber-300" },
  atencion: { icono: "!", clase: "text-red-700 dark:text-red-300" },
  neutro: { icono: "•", clase: "text-zinc-600 dark:text-zinc-400" },
};

const MARCA_TONO: Record<Tono, string> = {
  bien: "bg-[#0ca30c] text-white",
  regular: "bg-[#fab219] text-zinc-900",
  atencion: "bg-[#d03b3b] text-white",
  neutro: "bg-zinc-300 text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100",
};

export function LecturaLinea({ lectura }: { lectura: Lectura }) {
  const t = TONO[lectura.tono];
  return (
    <p className={`flex gap-2 text-sm leading-snug ${t.clase}`}>
      <span
        aria-hidden
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${MARCA_TONO[lectura.tono]}`}
      >
        {t.icono}
      </span>
      <span>{lectura.texto}</span>
    </p>
  );
}

// Grupos del mosaico, en el orden en que se cuentan: del final del proceso al que necesita ayuda.
const GRUPOS = [
  { clave: "certificados", etiqueta: "Certificados", ayuda: "Terminaron todo el proceso.", clase: "bg-azul dark:bg-sky-300", marca: "★" },
  { clave: "porCertificar", etiqueta: "Por certificar", ayuda: "Completaron las seis evidencias.", clase: "bg-sky-500", marca: "" },
  { clave: "alDia", etiqueta: "Al día", ayuda: "Sin ninguna entrega vencida.", clase: "bg-[#0ca30c]", marca: "" },
  { clave: "enRiesgo", etiqueta: "Necesitan atención", ayuda: "Algo vencido o señal de deserción.", clase: "bg-[#d03b3b]", marca: "!" },
  { clave: "enPausa", etiqueta: "En pausa o retirados", ayuda: "Interrumpida, aplazada o desertó.", clase: "bg-zinc-300 dark:bg-zinc-600", marca: "" },
] as const;

const MAXIMO_CUADROS = 150;

function Mosaico({ s, total }: { s: Semaforo; total: number }) {
  // Hasta 150 aprendices, un cuadro por persona; con más, 100 cuadros y cada uno es 1 %.
  const porPersona = total <= MAXIMO_CUADROS;
  const cuadros = GRUPOS.flatMap((g) => {
    const n = porPersona ? s[g.clave] : Math.round((s[g.clave] / Math.max(1, total)) * 100);
    return Array.from({ length: n }, () => g);
  });
  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={GRUPOS.map((g) => `${g.etiqueta}: ${s[g.clave]}`).join(", ")}
        className="flex flex-wrap gap-[3px]"
      >
        {cuadros.map((g, i) => (
          <span
            key={i}
            title={`${g.etiqueta} — ${g.ayuda}`}
            className={`grid h-6 w-6 place-items-center rounded-[4px] text-[11px] font-bold text-white print:[print-color-adjust:exact] ${g.clase}`}
          >
            {g.marca}
          </span>
        ))}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {porPersona ? "Cada cuadro es un aprendiz." : "Cada cuadro es el 1 % de los aprendices."}
      </p>
    </div>
  );
}

function Tarjeta({
  pregunta,
  valor,
  deCuantos,
  porcentaje,
  significado,
  lectura,
  barra,
  enlace,
}: {
  pregunta: string;
  valor: number;
  deCuantos?: string;
  porcentaje?: number;
  significado: string;
  lectura: Lectura;
  barra?: string;
  enlace?: { href: string; texto: string };
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 print:break-inside-avoid print:border-zinc-300">
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{pregunta}</p>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{valor}</span>
        {deCuantos && <span className="text-sm text-zinc-500 dark:text-zinc-400">{deCuantos}</span>}
        {porcentaje !== undefined && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {porcentaje} %
          </span>
        )}
      </p>
      {barra !== undefined && porcentaje !== undefined && (
        <span aria-hidden className="block h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <span className={`block h-full rounded-full print:[print-color-adjust:exact] ${barra}`} style={{ width: `${porcentaje}%` }} />
        </span>
      )}
      <p className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">{significado}</p>
      <LecturaLinea lectura={lectura} />
      {enlace && (
        <a href={enlace.href} className="mt-auto w-fit text-sm font-medium text-azul underline dark:text-sky-300 print:hidden">
          {enlace.texto}
        </a>
      )}
    </div>
  );
}

export function PanoramaAprendices({ s, total }: { s: Semaforo; total: number }) {
  const enPractica = s.alDia + s.enRiesgo;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  const frase =
    total === 0
      ? "Ningún aprendiz cumple los filtros elegidos."
      : [
          `De ${total} aprendices, ${s.alDia} ${s.alDia === 1 ? "va" : "van"} al día`,
          s.enRiesgo ? `${s.enRiesgo} ${s.enRiesgo === 1 ? "necesita" : "necesitan"} atención` : null,
          s.porCertificar ? `${s.porCertificar} ${s.porCertificar === 1 ? "espera" : "esperan"} certificación` : null,
          s.certificados ? `${s.certificados} ${s.certificados === 1 ? "terminó" : "terminaron"}` : null,
          s.enPausa ? `${s.enPausa} en pausa o retirados` : null,
        ]
          .filter(Boolean)
          .join(", ")
          .replace(/, ([^,]*)$/, " y $1") + ".";

  return (
    <section id="resumen" className="flex scroll-mt-4 flex-col gap-3">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:break-inside-avoid print:border-zinc-300">
        <p className="text-xs font-semibold uppercase tracking-wide text-sena">Panorama</p>
        <h2 className="mt-1 text-xl font-semibold text-zinc-900 [text-wrap:balance] dark:text-zinc-50">¿Cómo van nuestros aprendices?</h2>
        <p className="mt-1 max-w-3xl text-base text-zinc-700 [text-wrap:pretty] dark:text-zinc-300">{frase}</p>
        {enPractica > 0 && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Dicho de otra forma: de cada 10 aprendices en práctica, {deCadaDiez(s.alDia, enPractica)} van al día.
          </p>
        )}
        {total > 0 && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_16rem] lg:items-start">
            <Mosaico s={s} total={total} />
            <ul className="flex flex-col gap-2">
              {GRUPOS.filter((g) => s[g.clave] > 0 || g.clave === "alDia" || g.clave === "enRiesgo").map((g) => (
                <li key={g.clave} className="flex items-start gap-2 text-sm">
                  <span
                    aria-hidden
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[3px] text-[9px] font-bold text-white print:[print-color-adjust:exact] ${g.clase}`}
                  >
                    {g.marca}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium text-zinc-800 dark:text-zinc-100">{g.etiqueta}</span>
                    <span className="tabular-nums text-zinc-500 dark:text-zinc-400"> · {s[g.clave]}</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">{g.ayuda}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          pregunta="¿A cuántos acompañamos?"
          valor={total}
          deCuantos={total === 1 ? "aprendiz" : "aprendices"}
          significado="Todos los aprendices en etapa productiva que cumplen los filtros, estén como estén."
          lectura={{
            texto: `${enPractica} en práctica activa${s.porCertificar + s.certificados ? `, ${s.porCertificar + s.certificados} ya cumplieron sus evidencias` : ""}${s.enPausa ? ` y ${s.enPausa} en pausa o retirados` : ""}.`,
            tono: "neutro",
          }}
        />
        <Tarjeta
          pregunta="¿Cuántos van al día?"
          valor={s.alDia}
          deCuantos={`de ${enPractica} en práctica`}
          porcentaje={pct(s.alDia, enPractica)}
          barra="bg-[#0ca30c]"
          significado="Aprendices en práctica sin ninguna entrega vencida: alternativa, formalización, momentos, bitácoras y certificación."
          lectura={lecturaAlDia(s.alDia, enPractica)}
        />
        <Tarjeta
          pregunta="¿Quiénes necesitan atención?"
          valor={s.enRiesgo}
          deCuantos={`de ${enPractica} en práctica`}
          porcentaje={pct(s.enRiesgo, enPractica)}
          barra="bg-[#d03b3b]"
          significado="Tienen al menos una entrega vencida o una señal de deserción (por ejemplo, no se ha concertado a tiempo)."
          lectura={lecturaEnRiesgo(s.enRiesgo, enPractica)}
          enlace={s.enRiesgo ? { href: "#necesitan-atencion", texto: "Ver quiénes son y qué les falta ↓" } : undefined}
        />
        <Tarjeta
          pregunta="¿Cuántos terminaron?"
          valor={s.certificados}
          deCuantos={s.certificados === 1 ? "certificado" : "certificados"}
          significado="Certificado = terminó todo el proceso. Por certificar = ya completó las seis evidencias."
          lectura={lecturaCertificados(s.certificados, s.porCertificar)}
        />
      </div>
    </section>
  );
}

// Un indicador con su número, qué significa y cómo leerlo. Lo usan las métricas de Reportes.
export function IndicadorExplicado({
  etiqueta,
  valor,
  detalle,
  significado,
  lectura,
}: {
  etiqueta: string;
  valor: string | number;
  detalle?: string;
  significado: string;
  lectura: Lectura;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 px-3 py-3 dark:border-zinc-800 print:break-inside-avoid print:border-zinc-300">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
      <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{valor}</p>
      {detalle && <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{detalle}</p>}
      <p className="text-xs leading-snug text-zinc-600 dark:text-zinc-300">
        <span className="font-medium">Qué mide: </span>
        {significado}
      </p>
      <LecturaLinea lectura={lectura} />
    </div>
  );
}
