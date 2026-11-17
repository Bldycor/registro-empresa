import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { leerBitacoraDeUrl } from "@/lib/leer-bitacora-url";

// Lee la bitácora GFPI-F-147 recién adjuntada y devuelve lo que trae, **sin guardar nada**: el
// aprendiz la ve diligenciada al instante, corrige lo que haga falta y guarda al enviar.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const cuerpo = (await request.json().catch(() => null)) as { archivoUrl?: string } | null;
  const archivoUrl = (cuerpo?.archivoUrl ?? "").trim();
  if (!archivoUrl) {
    return NextResponse.json({ error: "Falta el documento." }, { status: 400 });
  }

  // Una foto no se lee: la pantalla pide el PDF.
  const { error, ...lectura } = await leerBitacoraDeUrl(archivoUrl);
  if (error) return NextResponse.json({ datos: {}, leidos: 0, sinTexto: false, error: true });
  // Un PDF con texto en el que no se halló la tabla bloquea al aprendiz: queda en los logs de
  // Vercel («bitacora-sin-actividades») con el archivo, para revisar el lector sin esperar el reclamo.
  if (!lectura.esImagen && !lectura.sinTexto && !lectura.actividades?.length) {
    console.warn("bitacora-sin-actividades", JSON.stringify({ aprendiz: user.id, archivoUrl, leidos: lectura.leidos }));
  }
  return NextResponse.json(lectura);
}
