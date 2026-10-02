import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { validarNit } from "@/lib/nit";
import { consultarRues } from "@/lib/rues";

// Consulta un NIT en el RUES para que el administrador registre la empresa con su razón social
// oficial (solo ADMIN). No guarda nada. Si el RUES no responde, se avisa y se puede registrar a
// mano: el registro de SEPA no depende de que un servicio externo esté en línea.
export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const nit = validarNit(new URL(request.url).searchParams.get("nit") ?? "");
  if (!nit.ok) {
    return NextResponse.json({ valido: false, error: nit.error });
  }

  const enSepa = await prisma.empresa.findUnique({
    where: { nit: nit.nit },
    select: { id: true, nombre: true },
  });

  try {
    const rues = await consultarRues(nit.base);
    return NextResponse.json({ valido: true, nit: nit.nit, rues, enSepa });
  } catch (error) {
    console.error("[admin/empresas/rues] El RUES no respondió:", error);
    return NextResponse.json({ valido: true, nit: nit.nit, rues: null, enSepa, ruesNoDisponible: true });
  }
}
