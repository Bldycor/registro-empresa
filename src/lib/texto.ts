// Normalización de texto compartida por los importadores de hoja de cálculo (fichas,
// aprendices, competencias): quita acentos y puntuación para poder emparejar encabezados/valores
// pegados desde Excel contra un catálogo fijo, sin exigir coincidencia exacta de tildes o mayúsculas.

export function quitarAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function claveEncabezado(texto: string): string {
  return quitarAcentos(texto).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizarCatalogo<T extends string>(
  crudo: string,
  mapa: Record<string, T>
): { valor: T | null; reconocido: boolean } {
  const texto = crudo.trim();
  if (!texto) return { valor: null, reconocido: true };
  const clave = claveEncabezado(texto);
  const valor = mapa[clave];
  return valor ? { valor, reconocido: true } : { valor: null, reconocido: false };
}
