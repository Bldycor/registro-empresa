import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Catálogo de competencias/resultados de aprendizaje de un programa — lo usa el instructor para
// elegir, durante la valoración de la Concertación (Momento 1), las competencias y resultados de
// aprendizaje acordados con el aprendiz. Mismo catálogo que ya usa el aprendiz en las actividades
// de Bitácora (ver /api/etapa-productiva/competencias); aquí se parametriza por `programa` porque
// el instructor consulta el catálogo de aprendices de distintas fichas/programas.
export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const programa = searchParams.get("programa");
  if (!programa) {
    return NextResponse.json({ competencias: [] });
  }

  const competencias = await prisma.competenciaFormacion.findMany({
    where: { programa },
    select: { id: true, tipo: true, nombreCompetencia: true, resultadoAprendizaje: true },
    orderBy: [{ tipo: "asc" }, { nombreCompetencia: "asc" }, { resultadoAprendizaje: "asc" }],
  });

  return NextResponse.json({ competencias });
}
