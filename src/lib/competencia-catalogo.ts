// Catálogo institucional de competencias/resultados de aprendizaje por programa
// (`CompetenciaFormacion`), administrado por Coordinación. Se usa dondequiera que el aprendiz o
// el instructor deban elegir una competencia en vez de escribirla a mano: actividades de
// Bitácora (`bitacora-form.tsx`) y, desde aquí, la valoración de la Concertación (Momento 1).
export type CompetenciaCatalogo = {
  id: string;
  tipo: "TECNICA" | "BASICA_CLAVE";
  nombreCompetencia: string;
  resultadoAprendizaje: string;
};

export function agruparCompetencias(
  catalogo: CompetenciaCatalogo[]
): [string, CompetenciaCatalogo[]][] {
  const grupos = new Map<string, CompetenciaCatalogo[]>();
  for (const c of catalogo) {
    const lista = grupos.get(c.nombreCompetencia) ?? [];
    lista.push(c);
    grupos.set(c.nombreCompetencia, lista);
  }
  return Array.from(grupos.entries());
}

// --- Plan de trabajo del Momento 1 elegido del catálogo (decisión de Coordinación, 2 oct 2026) ---
//
// Las competencias y los resultados de aprendizaje del plan se guardan como texto, uno por línea
// (`ConcertacionFuncion.competenciasDesarrollar` / `.resultadosAprendizaje`), igual que los deja
// el instructor. El aprendiz ya no los escribe: los elige del catálogo del programa de su ficha.
// Estas funciones pasan de ese texto a filas «competencia → resultado» y de vuelta.

export type FilaPlan = { competencia: string; resultado: string };

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function lineas(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// Del texto guardado a filas. Lo que no está en el catálogo se devuelve aparte, para mostrarlo y
// que no desaparezca sin que el aprendiz lo vea.
export function filasDesdeTexto(
  competenciasTexto: string,
  resultadosTexto: string,
  catalogo: CompetenciaCatalogo[],
): { filas: FilaPlan[]; sinCoincidencia: string[] } {
  const filas: FilaPlan[] = [];
  const sinCoincidencia: string[] = [];
  const cubiertas = new Set<string>();

  for (const ra of lineas(resultadosTexto)) {
    const item = catalogo.find((c) => c.resultadoAprendizaje === ra);
    if (item) {
      filas.push({ competencia: item.nombreCompetencia, resultado: item.resultadoAprendizaje });
      cubiertas.add(item.nombreCompetencia);
    } else sinCoincidencia.push(ra);
  }

  const nombres = new Set(catalogo.map((c) => c.nombreCompetencia));
  for (const comp of lineas(competenciasTexto)) {
    if (nombres.has(comp)) {
      if (!cubiertas.has(comp)) {
        filas.push({ competencia: comp, resultado: "" });
        cubiertas.add(comp);
      }
    } else sinCoincidencia.push(comp);
  }

  return { filas, sinCoincidencia };
}

// De filas al texto que se guarda: competencias sin repetir, y los resultados elegidos.
export function textoDesdeFilas(filas: FilaPlan[]): { competencias: string; resultados: string } {
  return {
    competencias: [...new Set(filas.map((f) => f.competencia).filter(Boolean))].join("\n"),
    resultados: filas.map((f) => f.resultado).filter(Boolean).join("\n"),
  };
}

// Casa el texto leído de un documento (el GFPI-F-023 en PDF) con el catálogo: elige los
// resultados de aprendizaje que aparecen escritos en él y las competencias nombradas. Lo que no
// se reconoce no se adivina.
export function filasDesdeDocumento(
  competenciasLeidas: string,
  resultadosLeidos: string,
  catalogo: CompetenciaCatalogo[],
): FilaPlan[] {
  const textoRa = normalizar(resultadosLeidos);
  const textoComp = normalizar(`${competenciasLeidas} ${resultadosLeidos}`);
  const filas: FilaPlan[] = [];
  const cubiertas = new Set<string>();

  // Sin el prefijo («RA1», «RAP 2.», «3.»), que cambia de un documento a otro.
  const sinPrefijo = (ra: string) => normalizar(ra).replace(/^(RAP?\s*\d+\.?|\d+\.)\s*/, "");

  for (const c of catalogo) {
    const nucleo = sinPrefijo(c.resultadoAprendizaje);
    if (nucleo.length >= 15 && textoRa.includes(nucleo) && !filas.some((f) => sinPrefijo(f.resultado) === nucleo)) {
      filas.push({ competencia: c.nombreCompetencia, resultado: c.resultadoAprendizaje });
      cubiertas.add(c.nombreCompetencia);
    }
  }
  for (const [nombre] of agruparCompetencias(catalogo)) {
    if (!cubiertas.has(nombre) && normalizar(nombre).length >= 15 && textoComp.includes(normalizar(nombre))) {
      filas.push({ competencia: nombre, resultado: "" });
      cubiertas.add(nombre);
    }
  }
  return filas;
}

// Competencia de una bitácora leída del PDF → nombre exacto del catálogo, o "" si no coincide con
// ninguna. Si el PDF trae un resultado de aprendizaje, se toma la competencia a la que pertenece.
// Nunca se deja texto que no esté en el catálogo (decisión de Coordinación, 2 oct 2026).
export function competenciaDelCatalogo(texto: string | null | undefined, catalogo: CompetenciaCatalogo[]): string {
  const buscado = normalizar(texto ?? "");
  if (!buscado) return "";
  const porNombre = catalogo.find((c) => normalizar(c.nombreCompetencia) === buscado);
  if (porNombre) return porNombre.nombreCompetencia;
  const sinPrefijo = (ra: string) => normalizar(ra).replace(/^(RAP?\s*\d+\.?|\d+\.)\s*/, "");
  const porResultado = catalogo.find((c) => sinPrefijo(c.resultadoAprendizaje) === sinPrefijo(buscado));
  if (porResultado) return porResultado.nombreCompetencia;
  const contenida = catalogo.find(
    (c) => normalizar(c.nombreCompetencia).length >= 15 && buscado.includes(normalizar(c.nombreCompetencia)),
  );
  return contenida?.nombreCompetencia ?? "";
}
