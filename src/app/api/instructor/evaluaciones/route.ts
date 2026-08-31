import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import type { Prisma } from "@/generated/prisma/client";

const EVALUACION_SELECT = {
  id: true,
  numero: true,
  fecha: true,
  horaInicio: true,
  horaFin: true,
  modalidad: true,
  videollamadaUrl: true,
  juicioFinal: true,
  retroalimentacionCoformador: true,
  retroalimentacionInstructor: true,
  retroalimentacionAprendiz: true,
  estado: true,
  fechaAval: true,
  variables: {
    select: { variable: true, categoria: true, valoracion: true, observaciones: true },
  },
  user: {
    select: { id: true, nombres: true, apellidos: true, cedula: true, ficha: { select: { codigo: true } } },
  },
} satisfies Prisma.EvaluacionSelect;

// Evaluaciones (Momento 2/3) de los aprendices de las fichas asignadas al instructor — mismo
// alcance que Bitácoras/Formalizaciones: solo sus propias fichas.
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const evaluaciones = await prisma.evaluacion.findMany({
    where: { numero: { in: [2, 3] }, esExtraordinario: false, user: { ficha: { instructorId: user.id } } },
    select: EVALUACION_SELECT,
    orderBy: [{ fecha: "asc" }],
  });

  return NextResponse.json({ evaluaciones });
}
