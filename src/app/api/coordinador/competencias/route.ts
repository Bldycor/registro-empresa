import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CompetenciaFormacionSchema } from "@/lib/validations";

// Catálogo institucional de competencias por programa — administrado por Coordinador/Admin (ver
// evidencia (c) Bitácoras, donde el aprendiz elige de este catálogo en vez de escribirlo a mano).
export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const programa = searchParams.get("programa");

  const competencias = await prisma.competenciaFormacion.findMany({
    where: programa ? { programa } : undefined,
    orderBy: [{ programa: "asc" }, { nombreCompetencia: "asc" }, { resultadoAprendizaje: "asc" }],
  });

  return NextResponse.json({ competencias });
}

// Alta manual de una fila suelta (además de la importación masiva en /import).
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = CompetenciaFormacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const competencia = await prisma.competenciaFormacion.create({
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
    return NextResponse.json({ competencia }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Ya existe una competencia con ese programa, código y resultado de aprendizaje." },
      { status: 409 },
    );
  }
}
