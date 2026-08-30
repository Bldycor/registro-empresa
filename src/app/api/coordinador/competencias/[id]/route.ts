import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CompetenciaFormacionSchema } from "@/lib/validations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const body = await request.json();
  const parsed = CompetenciaFormacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const competencia = await prisma.competenciaFormacion.update({
      where: { id },
      data: {
        programa: d.programa,
        tipo: d.tipo,
        codigoCompetencia: d.codigoCompetencia,
        nombreCompetencia: d.nombreCompetencia,
        resultadoAprendizaje: d.resultadoAprendizaje,
        horas: d.horas ?? null,
        redConocimiento: d.redConocimiento || null,
      },
    });
    return NextResponse.json({ competencia });
  } catch {
    return NextResponse.json(
      { error: "Ya existe una competencia con ese programa, código y resultado de aprendizaje." },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;
  await prisma.competenciaFormacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
