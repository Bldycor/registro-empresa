"use client";

import { useState } from "react";
import type { PuntoCurva } from "@/lib/reportes";

// Curva de avance de bitácoras (tablero de Coordinación de Formación, 26 oct 2026): al cierre de
// cada mes, cuántas debían estar entregadas según el plan, cuántas lo estaban y cuántas tenían aval.
// El plan va como contexto (área gris tenue); las dos series reales en azul y verde, validadas con
// el script de dataviz en claro (#1f6fb2, #2f8a00 sobre blanco) y oscuro (#3d8fd1, #39a900 sobre
// #00304d). Una sola escala; la línea vertical sigue al puntero o a las flechas del teclado, y la
// tabla trae los mismos valores sin depender del color ni del puntero.

const W = 640;
const H = 250;
const M = { izq: 34, der: 92, arr: 14, aba: 30 };

const SERIES = [
  { clave: "esperadas", etiqueta: "Esperadas (plan)", linea: "stroke-zinc-400 dark:stroke-zinc-500", punto: "fill-zinc-400 dark:fill-zinc-500" },
  { clave: "entregadas", etiqueta: "Entregadas", linea: "stroke-[#1f6fb2] dark:stroke-[#3d8fd1]", punto: "fill-[#1f6fb2] dark:fill-[#3d8fd1]" },
  { clave: "avaladas", etiqueta: "Avaladas", linea: "stroke-[#2f8a00] dark:stroke-[#39a900]", punto: "fill-[#2f8a00] dark:fill-[#39a900]" },
] as const;

function tope(max: number): { maximo: number; paso: number } {
  if (max <= 0) return { maximo: 4, paso: 1 };
  const bruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 5, 10].map((f) => f * mag).find((p) => p >= bruto) ?? 10 * mag;
  return { maximo: Math.ceil(max / paso) * paso, paso };
}

export function CurvaBitacoras({ puntos, mesInicioSepa }: { puntos: PuntoCurva[]; mesInicioSepa: string | null }) {
  const [activo, setActivo] = useState<number | null>(null);
  if (puntos.length < 2) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay meses suficientes para dibujar la curva.</p>;
  }

  const { maximo, paso } = tope(Math.max(...puntos.map((p) => p.esperadas)));
  const ancho = W - M.izq - M.der;
  const alto = H - M.arr - M.aba;
  const x = (i: number) => M.izq + (ancho * i) / (puntos.length - 1);
  const y = (v: number) => M.arr + alto - (alto * v) / maximo;
  const ruta = (k: (typeof SERIES)[number]["clave"]) => puntos.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[k])}`).join(" ");
  const area = `${ruta("esperadas")} L${x(puntos.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = Array.from({ length: maximo / paso + 1 }, (_, i) => i * paso);
  const ultimo = puntos[puntos.length - 1];
  const iSepa = mesInicioSepa ? puntos.findIndex((p) => p.mes === mesInicioSepa) : -1;

  // Etiquetas al final de cada línea; si dos quedan muy juntas, la de abajo baja lo justo.
  const finales = SERIES.map((s) => ({ ...s, valor: ultimo[s.clave], yy: y(ultimo[s.clave]) })).sort((a, b) => a.yy - b.yy);
  for (let i = 1; i < finales.length; i++) finales[i].yy = Math.max(finales[i].yy, finales[i - 1].yy + 14);

  function moverA(clientX: number, caja: DOMRect) {
    const rel = ((clientX - caja.left) / caja.width) * W;
    const i = Math.round(((rel - M.izq) / ancho) * (puntos.length - 1));
    setActivo(Math.max(0, Math.min(puntos.length - 1, i)));
  }

  const a = activo !== null ? puntos[activo] : null;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
        {SERIES.map((s) => (
          <li key={s.clave} className="flex items-center gap-1.5">
            <svg aria-hidden width="16" height="4">
              <line x1="0" y1="2" x2="16" y2="2" strokeWidth="2" strokeLinecap="round" className={s.linea} />
            </svg>
            {s.etiqueta}
          </li>
        ))}
      </ul>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          role="img"
          aria-label={`Curva de avance de bitácoras. Al cierre de ${ultimo.etiqueta}: ${ultimo.esperadas} esperadas, ${ultimo.entregadas} entregadas y ${ultimo.avaladas} avaladas.`}
          tabIndex={0}
          onPointerMove={(e) => moverA(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActivo(null)}
          onFocus={() => setActivo(puntos.length - 1)}
          onBlur={() => setActivo(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActivo((i) => Math.max(0, (i ?? puntos.length) - 1));
            if (e.key === "ArrowRight") setActivo((i) => Math.min(puntos.length - 1, (i ?? -1) + 1));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.izq} x2={W - M.der} y1={y(t)} y2={y(t)} strokeWidth="1" className="stroke-zinc-100 dark:stroke-zinc-800" />
              <text x={M.izq - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-zinc-500 text-[10px] tabular-nums dark:fill-zinc-400">
                {t}
              </text>
            </g>
          ))}
          {puntos.map((p, i) => (
            <text key={p.mes} x={x(i)} y={H - 10} textAnchor="middle" className="fill-zinc-500 text-[10px] dark:fill-zinc-400">
              {p.etiqueta}
            </text>
          ))}

          {iSepa > 0 && (
            <g>
              <line x1={x(iSepa)} x2={x(iSepa)} y1={M.arr} y2={y(0)} strokeWidth="1" className="stroke-zinc-300 dark:stroke-zinc-600" />
              <text x={x(iSepa) + 4} y={M.arr + 8} className="fill-zinc-500 text-[10px] dark:fill-zinc-400">
                SEPA empieza a recibir bitácoras
              </text>
            </g>
          )}

          <path d={area} className="fill-zinc-400/10 dark:fill-zinc-500/15" />
          {SERIES.map((s) => (
            <path key={s.clave} d={ruta(s.clave)} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className={s.linea} />
          ))}

          {finales.map((s) => (
            <g key={s.clave}>
              <circle
                cx={x(puntos.length - 1)}
                cy={y(s.valor)}
                r="4"
                strokeWidth="2"
                className={`${s.punto} stroke-white dark:stroke-zinc-900`}
              />
              <text x={x(puntos.length - 1) + 9} y={s.yy} dy="0.32em" className="fill-zinc-700 text-[11px] font-medium tabular-nums dark:fill-zinc-200">
                {s.valor} {s.clave === "esperadas" ? "plan" : s.clave}
              </text>
            </g>
          ))}

          {activo !== null && (
            <g>
              <line x1={x(activo)} x2={x(activo)} y1={M.arr} y2={y(0)} strokeWidth="1" className="stroke-zinc-400 dark:stroke-zinc-500" />
              {SERIES.map((s) => (
                <circle
                  key={s.clave}
                  cx={x(activo)}
                  cy={y(puntos[activo][s.clave])}
                  r="4"
                  strokeWidth="2"
                  className={`${s.punto} stroke-white dark:stroke-zinc-900`}
                />
              ))}
            </g>
          )}
        </svg>

        {a && activo !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-950"
            style={{
              left: `${(x(activo) / W) * 100}%`,
              transform: activo > (puntos.length - 1) / 2 ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-200">
              {a.etiqueta}
              {a.enCurso ? " (hasta hoy)" : ""}
            </p>
            {SERIES.map((s) => (
              <p key={s.clave} className="flex items-center gap-2 whitespace-nowrap">
                <svg aria-hidden width="12" height="4">
                  <line x1="0" y1="2" x2="12" y2="2" strokeWidth="2" strokeLinecap="round" className={s.linea} />
                </svg>
                <strong className="tabular-nums text-zinc-900 dark:text-zinc-50">{a[s.clave]}</strong>
                <span className="text-zinc-500 dark:text-zinc-400">{s.etiqueta.toLowerCase()}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="text-xs text-zinc-600 dark:text-zinc-300 print:hidden">
        <summary className="cursor-pointer font-medium text-zinc-700 underline dark:text-zinc-200">Ver los datos en tabla</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-[420px] text-left">
            <thead>
              <tr className="text-zinc-500 dark:text-zinc-400">
                <th className="py-1 pr-4 font-medium">Mes</th>
                {SERIES.map((s) => (
                  <th key={s.clave} className="py-1 pr-4 text-right font-medium">
                    {s.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {puntos.map((p) => (
                <tr key={p.mes} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-1 pr-4">
                    {p.etiqueta}
                    {p.enCurso ? " (hasta hoy)" : ""}
                  </td>
                  {SERIES.map((s) => (
                    <td key={s.clave} className="py-1 pr-4 text-right tabular-nums">
                      {p[s.clave]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
