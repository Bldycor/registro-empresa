// Utilidades compartidas por los lectores de formatos en PDF (GFPI-F-023 y GFPI-F-147).
//
// `pdfjs-dist` se importa dentro de la función para que su peso no entre en las rutas que no leen
// documentos, y su worker se registra a mano porque en el servidor no hay Web Worker.

// Un PDF empieza siempre con «%PDF». Una foto (JPG, PNG, WEBP) no: no se intenta abrirla como PDF.
export function esPdf(archivo: ArrayBuffer): boolean {
  const inicio = new Uint8Array(archivo.slice(0, 1024));
  return new TextDecoder("latin1").decode(inicio).includes("%PDF");
}

export async function textoDelPdf(archivo: ArrayBuffer): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  await import("pdfjs-dist/legacy/build/pdf.worker.mjs");

  const pdf = await getDocument({
    data: new Uint8Array(archivo),
    // Solo se necesita el texto: sin fuentes del sistema ni canvas.
    useSystemFonts: false,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;

  let texto = "";
  for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
    const contenido = await (await pdf.getPage(pagina)).getTextContent();
    texto += contenido.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return texto.replace(/ /g, " ").replace(/[ \t]+/g, " ");
}

// Borra del texto los trozos que trae la propia plantilla (instrucciones, títulos de columna,
// notas al pie): no son datos del aprendiz.
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
