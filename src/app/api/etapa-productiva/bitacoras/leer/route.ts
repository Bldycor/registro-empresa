import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { leerBitacora } from "@/lib/leer-gfpi147";
import { esPdf } from "@/lib/leer-pdf";

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

  try {
    const respuesta = await fetch(archivoUrl);
    if (!respuesta.ok) {
      return NextResponse.json({ datos: {}, leidos: 0, sinTexto: false });
    }
    const archivo = await respuesta.arrayBuffer();
    // Una foto no se lee: el aprendiz diligencia los campos a mano.
    if (!esPdf(archivo)) return NextResponse.json({ datos: {}, leidos: 0, sinTexto: true, esImagen: true });
    return NextResponse.json(await leerBitacora(archivo));
  } catch (error) {
    console.error("[bitacoras/leer] No se pudo leer el PDF adjunto:", error);
    return NextResponse.json({ datos: {}, leidos: 0, sinTexto: false });
  }
}
