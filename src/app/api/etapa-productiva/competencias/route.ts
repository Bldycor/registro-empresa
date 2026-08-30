import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Competencias/resultados de aprendizaje del programa de formación del aprendiz autenticado —
// alimenta el selector de "Competencias / resultados de aprendizaje" en las actividades de
// Bitácora. Si el programa de su ficha todavía no tiene catálogo importado, devuelve una lista
// vacía (el formulario cae de vuelta a texto libre en ese caso).
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const aprendiz = await prisma.user.findUnique({
    where: { id: user.id },
    select: { ficha: { select: { programa: true } } },
  });

  const programa = aprendiz?.ficha?.programa;
  if (!programa) {
    return NextResponse.json({ programa: null, competencias: [] });
  }

  const competencias = await prisma.competenciaFormacion.findMany({
    where: { programa },
    select: { id: true, tipo: true, nombreCompetencia: true, resultadoAprendizaje: true },
    orderBy: [{ tipo: "asc" }, { nombreCompetencia: "asc" }, { resultadoAprendizaje: "asc" }],
  });

  return NextResponse.json({ programa, competencias });
}
