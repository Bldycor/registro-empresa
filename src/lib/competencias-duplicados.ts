// En el catálogo de un programa no se admiten duplicados (decisión de Coordinación, 3 oct 2026):
// un mismo resultado de aprendizaje no puede quedar dos veces, aunque venga escrito con otro
// prefijo («1.», «RA1», «RAP 1.», «01-», «RA 1:») o con las horas al final («3C/144H»), y un mismo
// nombre de competencia no puede quedar con dos códigos distintos. Si no, el aprendiz y el
// instructor ven la misma opción dos veces en las listas.
//
// Reimportar la misma fila (mismo programa, código y texto exacto) no es duplicado: actualiza la
// que ya existe.

export type FilaCatalogo = {
  id?: string;
  programa: string;
  codigoCompetencia: string;
  nombreCompetencia: string;
  resultadoAprendizaje: string;
};

function base(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

function compactar(texto: string): string {
  return texto
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Texto del resultado sin numeración ni horas, para comparar.
export function claveResultado(texto: string): string {
  const sinPrefijo = base(texto)
    .trim()
    .replace(/^(RAP?\s*\d+\s*[:.)\-]?|RAP?\s*:|\d+\s*[:.)\-]+)\s*/, "")
    .replace(/\s*\d+\s*C\s*\/\s*\d+\s*H\s*\.?$/, "");
  return compactar(sinPrefijo);
}

export function claveCompetencia(nombre: string): string {
  return compactar(base(nombre));
}

function mismaFila(a: FilaCatalogo, b: FilaCatalogo): boolean {
  return (
    a.programa === b.programa &&
    a.codigoCompetencia === b.codigoCompetencia &&
    a.resultadoAprendizaje === b.resultadoAprendizaje
  );
}

// Primer conflicto de `fila` contra las filas ya existentes del mismo programa, en palabras, o
// null si no choca con ninguna. `fila.id` (al editar) se excluye a sí misma.
export function duplicadoEn(fila: FilaCatalogo, existentes: FilaCatalogo[]): string | null {
  const ra = claveResultado(fila.resultadoAprendizaje);
  const comp = claveCompetencia(fila.nombreCompetencia);
  for (const e of existentes) {
    if (e.programa !== fila.programa) continue;
    if (fila.id && e.id === fila.id) continue;
    if (!fila.id && mismaFila(e, fila)) continue; // Reimportación: se actualiza.
    if (ra && claveResultado(e.resultadoAprendizaje) === ra) {
      return `El resultado de aprendizaje ya está en el catálogo de ${fila.programa} como «${e.resultadoAprendizaje}».`;
    }
    if (comp && claveCompetencia(e.nombreCompetencia) === comp && e.codigoCompetencia !== fila.codigoCompetencia) {
      return `La competencia «${e.nombreCompetencia}» ya está en ${fila.programa} con el código ${e.codigoCompetencia}.`;
    }
  }
  return null;
}
