import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Asignar (o quitar) el instructor autorizado para evaluar una ficha. Cada ficha tiene a lo sumo
// un instructor; un instructor puede tener varias fichas (ver docs/PLAN-IMPLEMENTACION.md, Fase 1).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR"]);
  if (!user) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const instructorId: string | null = body?.instructorId ?? null;

  const ficha = await prisma.ficha.findUnique({ where: { id } });
  if (!ficha) {
    return NextResponse.json({ error: "La ficha no existe." }, { status: 404 });
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

  const actualizada = await prisma.ficha.update({
    where: { id },
    data: { instructorId },
    select: {
      id: true,
      codigo: true,
      instructorId: true,
      instructor: { select: { id: true, nombres: true, apellidos: true, email: true } },
    },
  });

  return NextResponse.json({ ficha: actualizada });
}
