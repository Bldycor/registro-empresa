import { esPdf } from "@/lib/leer-pdf";
import { leerBitacora, type LecturaBitacora } from "@/lib/leer-gfpi147";

// La bitácora de una dirección (9 nov 2026). El mismo PDF se leía hasta tres veces —al adjuntarlo,
// al enviarlo y cuando el instructor lo revisa—, y cada vez se descargaba y se analizaba entero.
// Una dirección de Vercel Blob no cambia de contenido (cada subida tiene la suya), así que la
// lectura se guarda en memoria un rato. Solo se guardan las lecturas que terminaron: un error de red
// se vuelve a intentar la próxima vez.

export type LecturaDeUrl = LecturaBitacora & { esImagen?: boolean; error?: boolean };

const VIGENCIA_MS = 15 * 60 * 1000;
const MAXIMO = 100;
const lecturas = new Map<string, { hasta: number; lectura: Promise<LecturaDeUrl> }>();

async function leer(url: string): Promise<LecturaDeUrl> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo descargar el adjunto (${respuesta.status}).`);
  const archivo = await respuesta.arrayBuffer();
  if (!esPdf(archivo)) return { datos: {}, leidos: 0, sinTexto: true, esImagen: true };
  return leerBitacora(archivo);
}

export function leerBitacoraDeUrl(url: string): Promise<LecturaDeUrl> {
  const ahora = Date.now();
  const guardada = lecturas.get(url);
  if (guardada && guardada.hasta > ahora) return guardada.lectura;

  const lectura = leer(url).catch((error) => {
    lecturas.delete(url);
    console.error("[leer-bitacora] No se pudo leer el PDF adjunto:", error);
    return { datos: {}, leidos: 0, sinTexto: false, error: true } as LecturaDeUrl;
  });
  if (lecturas.size >= MAXIMO) lecturas.delete(lecturas.keys().next().value!);
  lecturas.set(url, { hasta: ahora + VIGENCIA_MS, lectura });
  return lectura;
}
