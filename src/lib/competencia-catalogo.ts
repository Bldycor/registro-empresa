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
