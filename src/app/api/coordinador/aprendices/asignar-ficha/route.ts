import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Asigna (o quita) la misma ficha a varios aprendices de una sola vez, para cuando el
// coordinador/admin selecciona un lote en el panel en vez de asignar aprendiz por aprendiz.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const aprendizIds: string[] = Array.isArray(body?.aprendizIds) ? body.aprendizIds : [];
  const fichaId: string | null = body?.fichaId ?? null;

  if (aprendizIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un aprendiz." }, { status: 400 });
  }

  if (fichaId) {
    const ficha = await prisma.ficha.findUnique({ where: { id: fichaId } });
    if (!ficha) {
      return NextResponse.json({ error: "La ficha seleccionada no existe." }, { status: 400 });
    }
  }

  const resultado = await prisma.user.updateMany({
    where: { id: { in: aprendizIds }, role: "APRENDIZ" },
    data: { fichaId },
  });

  return NextResponse.json({ actualizados: resultado.count });
}
