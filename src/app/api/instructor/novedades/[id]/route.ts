import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { NovedadObservacionSchema } from "@/lib/validations";

// El instructor comenta una novedad de uno de sus aprendices: qué se acordó, qué sigue. No la
// avala —una novedad no es una evidencia—, solo deja su nota.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;
  const parsed = NovedadObservacionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existente = await prisma.novedadEtapaProductiva.findUnique({
    where: { id },
    select: { user: { select: { ficha: { select: { instructorId: true } } } } },
  });
  if (!existente) {
    return NextResponse.json({ error: "Novedad no encontrada." }, { status: 404 });
  }
  if (existente.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "Solo puedes comentar novedades de aprendices de tus fichas." },
      { status: 403 },
    );
  }

  const novedad = await prisma.novedadEtapaProductiva.update({
    where: { id },
    data: { observacionesInstructor: parsed.data.observacionesInstructor?.trim() || null },
    select: { id: true, observacionesInstructor: true },
  });

  return NextResponse.json({ novedad });
}
