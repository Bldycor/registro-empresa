import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { leerFormato } from "@/lib/leer-gfpi023";

// Lee el formato GFPI-F-023 recién adjuntado y devuelve lo que trae, **sin guardar nada**: el
// aprendiz lo ve al instante en el formulario, lo corrige si hace falta y recién al enviar queda
// registrado. Leer es lo que hace que no tenga que teclear lo que ya está en el documento.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const cuerpo = (await request.json().catch(() => null)) as {
    archivoUrl?: string;
    momento?: number;
  } | null;

  const archivoUrl = (cuerpo?.archivoUrl ?? "").trim();
  const momento = cuerpo?.momento;
  if (!archivoUrl || (momento !== 1 && momento !== 2 && momento !== 3)) {
    return NextResponse.json({ error: "Falta el documento o el momento." }, { status: 400 });
  }

  try {
    const respuesta = await fetch(archivoUrl);
    if (!respuesta.ok) {
      return NextResponse.json({ datos: {}, leidos: 0, sinTexto: false, error: "no-descargable" });
    }
    const lectura = await leerFormato(await respuesta.arrayBuffer(), momento);
    return NextResponse.json(lectura);
  } catch (error) {
    console.error("[formato/leer] No se pudo leer el PDF adjunto:", error);
    return NextResponse.json({ datos: {}, leidos: 0, sinTexto: false, error: "ilegible" });
  }
}
