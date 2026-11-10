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
  return NextResponse.json(lectura);
}
