// Utilidades compartidas por los lectores de formatos en PDF (GFPI-F-023 y GFPI-F-147).
//
// `pdfjs-dist` se importa dentro de la función para que su peso no entre en las rutas que no leen
// documentos, y su worker se registra a mano porque en el servidor no hay Web Worker.

// Un PDF empieza siempre con «%PDF». Una foto (JPG, PNG, WEBP) no: no se intenta abrirla como PDF.
export function esPdf(archivo: ArrayBuffer): boolean {
  const inicio = new Uint8Array(archivo.slice(0, 1024));
  return new TextDecoder("latin1").decode(inicio).includes("%PDF");
}

// Un texto del PDF con su posición (en puntos, origen abajo a la izquierda, como lo da pdfjs).
export type TextoPosicionado = { s: string; x: number; y: number; w: number };

// Cada página como lista de textos con posición. La necesita la lectura de las casillas marcadas
// con «X» (la rúbrica de los Momentos 2 y 3), donde importa en qué columna cae cada marca.
export async function paginasDelPdf(archivo: ArrayBuffer): Promise<TextoPosicionado[][]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");

  const pdf = await getDocument({
    data: new Uint8Array(archivo),
    // Solo se necesita el texto: sin fuentes del sistema ni canvas.
    useSystemFonts: false,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;

  const paginas: TextoPosicionado[][] = [];
  for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
    const contenido = await (await pdf.getPage(pagina)).getTextContent();
    paginas.push(
      contenido.items.flatMap((item) =>
        "str" in item && item.str.trim()
          ? [{ s: item.str.replace(/\u00a0/g, " "), x: item.transform[4], y: item.transform[5], w: item.width }]
          : [],
      ),
    );
  }
  return paginas;
}

export function textoDePaginas(paginas: TextoPosicionado[][]): string {
  return paginas
    .map((p) => p.map((i) => i.s).join(" ") + "\n")
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ");
}

export async function textoDelPdf(archivo: ArrayBuffer): Promise<string> {
  return textoDePaginas(await paginasDelPdf(archivo));
}

export function limpiarConPatrones(valor: string, patrones: RegExp[]): string {
  let v = valor;
  for (const patron of patrones) v = v.replace(patron, " ");
  return v.replace(/\s+/g, " ").trim();
}

export function primeraFecha(v: string): string | null {
  return v.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/)?.[0] ?? null;
}

export function soloDigitos(v: string, minimo: number): string | null {
  const m = v.match(new RegExp(`\\b\\d[\\d.\\-]{${minimo - 1},}`));
  return m ? m[0].replace(/[.\-]$/, "") : null;
}
