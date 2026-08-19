import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Asigna (o quita) el mismo instructor a varias fichas de una sola vez, para cuando el
// coordinador selecciona un lote en el panel en vez de asignar ficha por ficha.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR"]);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const fichaIds: string[] = Array.isArray(body?.fichaIds) ? body.fichaIds : [];
  const instructorId: string | null = body?.instructorId ?? null;

  if (fichaIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos una ficha." }, { status: 400 });
  }

  if (instructorId) {
    const instructor = await prisma.user.findUnique({ where: { id: instructorId } });
    if (!instructor || instructor.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "El usuario seleccionado no es un instructor válido." },
        { status: 400 }
      );
    }
  }

  const resultado = await prisma.ficha.updateMany({
    where: { id: { in: fichaIds } },
    data: { instructorId },
  });

  return NextResponse.json({ actualizadas: resultado.count });
}
