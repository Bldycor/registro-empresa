import type { TextoPosicionado } from "@/lib/leer-pdf";
import type { VariableEvaluacion } from "@/generated/prisma/enums";

// Rúbrica de los Momentos 2 y 3 leída del GFPI-F-023 firmado (pedido de Coordinación, 9 oct 2026).
//
// En el formato, cada una de las 13 variables es una fila: la valoración se marca con una «X» en
// la columna «Satisfactorio» o en «Por mejorar», y a la derecha van las «Observaciones /
// Compromisos de mejora». El texto plano no dice en qué columna quedó la X, así que aquí se lee
// por posición:
//   1. Se busca la página del momento («Momento N° 2 - Seguimiento Etapa Productiva» o «Momento
//      N° 3 - Evaluación etapa productiva»), sin confundirla con las de «Media técnica».
//   2. Se ubican los encabezados de cada tabla (Satisfactorio, Por mejorar, Observaciones).
//   3. Cada fila se reconoce por el comienzo de la etiqueta de la variable en la primera columna.
//   4. La X de la fila se asigna a la columna cuyo encabezado le queda más cerca (el corte es el
//      punto medio entre «Satisfactorio» y «Por mejorar»). Una fila sin X, o con X en las dos
//      columnas, queda sin valorar: nunca se adivina.
//   5. Lo que haya en la columna de observaciones dentro de la franja de la fila es su observación.

export type ValoracionLeida = {
  variable: VariableEvaluacion;
  valoracion: "SATISFACTORIO" | "POR_MEJORAR" | null;
  observaciones: string | null;
};

const ETIQUETAS: [VariableEvaluacion, RegExp][] = [
  ["APLICACION_CONOCIMIENTO", /^aplicaci[oó]n/i],
  ["MEJORA_CONTINUA", /^mejora/i],
  ["FORTALECIMIENTO_OCUPACIONAL", /^fortalecimiento/i],
  ["OPORTUNIDAD_CALIDAD", /^oportunidad/i],
  ["RESPONSABILIDAD_AMBIENTAL", /^responsabilidad/i],
  ["ADMINISTRACION_RECURSOS", /^administraci[oó]n/i],
  ["SEGURIDAD_SALUD_TRABAJO", /^seguridad/i],
  ["DOCUMENTACION_ETAPA_PRODUCTIVA", /^documentaci[oó]n/i],
  ["RELACIONES_INTERPERSONALES", /^relaciones/i],
  ["TRABAJO_EQUIPO", /^trabajo/i],
  ["SOLUCION_PROBLEMAS", /^soluci[oó]n/i],
  ["CUMPLIMIENTO", /^cumplimiento/i],
  ["ORGANIZACION", /^organizaci[oó]n/i],
];

const MARCA = /^[xX✓✔√]$/;

// Algunos PDF guardan la ligadura «ti» como otra letra: «ProducEva», «ProducUva» (pasó con el de
// Daniel Libardo Monroy, 9 oct 2026). Por eso «Produc…va» admite una pieza cualquiera en el medio.
const encabezadoMomento: Record<2 | 3, RegExp> = {
  2: /Momento\s*N\s*°\s*2\s*[-–]\s*Seguimiento\s*Etapa\s*Produc\S{1,3}va(?!\s*Media)/i,
  3: /Momento\s*N\s*°\s*3\s*[-–]\s*Evaluaci[oó]n\s*etapa\s*produc\S{1,3}va(?!\s*media)/i,
};

function paginaDelMomento(paginas: TextoPosicionado[][], momento: 2 | 3): TextoPosicionado[] | null {
  for (const p of paginas) {
    // El título del momento va arriba de la página: basta con el texto de la parte alta.
    const arriba = [...p].sort((a, b) => b.y - a.y || a.x - b.x).slice(0, 40).map((i) => i.s).join(" ").replace(/\s+/g, " ");
    if (encabezadoMomento[momento].test(arriba)) return p;
  }
  return null;
}

type Tabla = { y: number; satX: number; porX: number; obsX: number };

function tablasDe(items: TextoPosicionado[]): Tabla[] {
  const tablas: Tabla[] = [];
  // «Satisfactorio» también llega como «Sa5sfactorio» (la misma ligadura «ti»).
  for (const sat of items.filter((i) => /^sa(ti|\S)sfactori/i.test(i.s.trim()))) {
    const mismaFila = (i: TextoPosicionado) => Math.abs(i.y - sat.y) <= 8;
    const por = items.find((i) => mismaFila(i) && i.x > sat.x && /^por(\s|$)/i.test(i.s.trim()));
    const mejorar = items.find((i) => mismaFila(i) && i.x > sat.x && /mejorar/i.test(i.s));
    const porX = por?.x ?? (mejorar ? mejorar.x - 15 : null);
    if (porX === null) continue;
    // La columna de observaciones empieza donde termina «Por mejorar»: su texto va alineado a la
    // izquierda de la celda, no bajo la palabra «Observaciones» del encabezado (que va centrada).
    const finPor = mejorar ? mejorar.x + mejorar.w : porX + 45;
    tablas.push({ y: sat.y, satX: sat.x, porX, obsX: finPor + 3 });
  }
  return tablas.sort((a, b) => b.y - a.y);
}

export function leerRubrica(paginas: TextoPosicionado[][], momento: 2 | 3): ValoracionLeida[] {
  const pagina = paginaDelMomento(paginas, momento);
  if (!pagina) return [];
  const tablas = tablasDe(pagina);
  if (tablas.length === 0) return [];

  // Filas: la etiqueta de cada variable en la primera columna, debajo de algún encabezado. La
  // primera columna es la más a la izquierda donde aparecen etiquetas: así «trabajo», dentro de
  // «Seguridad y salud en el trabajo», no se toma por la fila «Trabajo en equipo».
  const deEtiqueta = pagina.filter((i) => ETIQUETAS.some(([, patron]) => patron.test(i.s.trim())));
  const primeraColumna = Math.min(...deEtiqueta.map((i) => i.x));
  const filas: { variable: VariableEvaluacion; y: number; tabla: Tabla }[] = [];
  for (const [variable, patron] of ETIQUETAS) {
    const candidata = pagina
      .filter((i) => patron.test(i.s.trim()) && i.x <= primeraColumna + 12)
      // La tabla de la fila es la del encabezado más cercano por encima (técnicos o actitudinales).
      .map((i) => ({ i, tabla: tablas.filter((t) => t.y > i.y && i.x < t.satX - 25).sort((a, b) => a.y - b.y)[0] }))
      .filter((c): c is { i: TextoPosicionado; tabla: Tabla } => Boolean(c.tabla))
      .sort((a, b) => b.i.y - a.i.y)[0];
    if (candidata) filas.push({ variable, y: candidata.i.y, tabla: candidata.tabla });
  }
  filas.sort((a, b) => b.y - a.y);

  return filas.map((fila, k) => {
    // Franja de la fila: hasta la mitad del camino a la fila de arriba y a la de abajo (de la
    // misma tabla); arriba de la primera, el encabezado.
    const anterior = filas[k - 1]?.tabla === fila.tabla ? filas[k - 1].y : fila.tabla.y - 2;
    const siguiente = filas[k + 1]?.tabla === fila.tabla ? filas[k + 1].y : fila.y - 14;
    const techo = (anterior + fila.y) / 2;
    const piso = (fila.y + siguiente) / 2;
    const enFranja = (i: TextoPosicionado) => i.y < techo && i.y >= piso;
    const cerca = (i: TextoPosicionado) => Math.abs(i.y - fila.y) <= 8;

    const corte = (fila.tabla.satX + fila.tabla.porX) / 2 + 5;
    const marcas = pagina.filter(
      (i) => MARCA.test(i.s.trim()) && (cerca(i) || enFranja(i)) && i.x > fila.tabla.satX - 45 && i.x < fila.tabla.obsX - 5,
    );
    const enSat = marcas.some((m) => m.x < corte);
    const enPor = marcas.some((m) => m.x >= corte);
    const valoracion = enSat && !enPor ? "SATISFACTORIO" : enPor && !enSat ? "POR_MEJORAR" : null;

    const observaciones = pagina
      .filter(
        (i) =>
          i.x >= fila.tabla.obsX &&
          (cerca(i) || enFranja(i)) &&
          !/^(observaciones|\/|compromisos|de|mejora)$/i.test(i.s.trim()) &&
          !/^observaciones\s*\/\s*compromisos/i.test(i.s.trim()),
      )
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((i) => i.s.trim())
      .join(" ")
      .replace(/\s+/g, " ")
      // Algunos PDF parten las vocales con tilde en piezas sueltas: «m á s» → «más».
      .replace(/(\p{L}) ([áéíóúÁÉÍÓÚñÑ]) (?=\p{L})/gu, "$1$2")
      .trim();

    return { variable: fila.variable, valoracion, observaciones: observaciones || null };
  });
}
