// Utilidades compartidas por los lectores de formatos en PDF (GFPI-F-023 y GFPI-F-147).
//
// `pdfjs-dist` se importa dentro de la función para que su peso no entre en las rutas que no leen
// documentos, y su worker se registra a mano porque en el servidor no hay Web Worker.

// Un PDF empieza siempre con «%PDF». Una foto (JPG, PNG, WEBP) no: no se intenta abrirla como PDF.
export function esPdf(archivo: ArrayBuffer): boolean {
  const inicio = new Uint8Array(archivo.slice(0, 1024));
  return new TextDecoder("latin1").decode(inicio).includes("%PDF");
}

// Un texto del PDF con su posición (en puntos, origen abajo a la izquierda, como lo da pdfjs) y
// el alto de su letra.
export type TextoPosicionado = { s: string; x: number; y: number; w: number; h: number };

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
          ? [
              {
                s: item.str.replace(/\u00a0/g, " "),
                x: item.transform[4],
                y: item.transform[5],
                w: item.width,
                h: item.height || Math.abs(item.transform[3]),
              },
            ]
          : [],
      ),
    );
  }
  return paginas;
}

// Une los textos en el orden dado. Word y Excel para Mac parten las palabras en trozos pegados
// uno al otro («f» + «ormación:», «GFPI» + «-» + «F»), y unirlos con un espacio dejaba
// «f ormación», así que ninguna etiqueta coincidía (28 oct 2026). Un trozo que empieza justo donde
// termina el anterior, en la misma línea, va pegado; si hay un hueco del ancho de un espacio o
// más, o cambia de línea, va separado. Los PDF que traen las palabras enteras quedan igual.
export function unirTextos(items: TextoPosicionado[]): string {
  let texto = "";
  let previo: TextoPosicionado | null = null;
  for (const i of items) {
    if (previo) {
      const alto = Math.max(previo.h, i.h, 1);
      const hueco = i.x - (previo.x + previo.w);
      const pegado = Math.abs(i.y - previo.y) < alto * 0.5 && hueco > -alto * 0.1 && hueco < alto * 0.12;
      if (!pegado) texto += " ";
    }
    texto += i.s;
    previo = i;
  }
  return texto;
}

// Algunas fuentes guardan la ligadura «ti» como otra letra: «AcRvidades», «ProducEva»,
// «Sa5sfactorio», «conRnua». Se repara solo en las palabras de las plantillas, para no tocar lo
// que escribió el aprendiz.
function repararLigaduraTi(texto: string): string {
  return texto.replace(/\b(Ac|ac|Produc|produc|Con|con|Sa|sa)[A-Z0-9](vidad|tud|va|vo|nua|sfactori)/g, "$1ti$2");
}

export function textoDePaginas(paginas: TextoPosicionado[][]): string {
  return repararLigaduraTi(
    paginas
      .map((p) => unirTextos(p) + "\n")
      .join("")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " "),
  );
}

// Los textos de una página agrupados en renglones, de arriba abajo y cada uno de izquierda a
// derecha: el orden en que se lee la hoja, sin importar el orden en que el archivo los guardó.
export function renglones(pagina: TextoPosicionado[]): TextoPosicionado[][] {
  const lineas: TextoPosicionado[][] = [];
  for (const i of [...pagina].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const linea = lineas.at(-1);
    if (linea && Math.abs(linea[0].y - i.y) < Math.max(linea[0].h, i.h, 1) * 0.5) linea.push(i);
    else lineas.push([i]);
  }
  return lineas.map((l) => l.sort((a, b) => a.x - b.x));
}

export function textoEnOrdenDeLectura(paginas: TextoPosicionado[][]): string {
  return repararLigaduraTi(
    paginas
      .flatMap((p) => renglones(p).map(unirTextos))
      .join("\n")
      .replace(/[ \t]+/g, " "),
  );
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
