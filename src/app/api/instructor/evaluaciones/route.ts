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
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      ficha: { select: { codigo: true, programa: true } },
    },
  },
} satisfies Prisma.EvaluacionSelect;

const CONCERTACION_SELECT = {
  id: true,
  fecha: true,
  horaInicio: true,
  horaFin: true,
  videollamadaUrl: true,
  estado: true,
  fechaAval: true,
  competenciasDesarrollar: true,
  resultadosAprendizaje: true,
  variables: {
    select: { variable: true, valoracion: true, observaciones: true },
  },
  user: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      ficha: { select: { codigo: true, programa: true } },
    },
  },
} satisfies Prisma.ConcertacionFuncionSelect;

// Las tres evaluaciones de la etapa productiva de los aprendices de las fichas asignadas al
// instructor — mismo alcance que Bitácoras/Formalizaciones: solo sus propias fichas. El Momento 1
// (Concertación) vive en un modelo aparte (`ConcertacionFuncion`, ya en producción antes de tener
// valoración) — se combina aquí con los Momentos 2/3 (`Evaluacion`) en una sola lista para que el
// instructor los avale desde el mismo panel.
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const [evaluaciones, concertaciones] = await Promise.all([
    prisma.evaluacion.findMany({
      where: { numero: { in: [2, 3] }, esExtraordinario: false, user: { ficha: { instructorId: user.id } } },
      select: EVALUACION_SELECT,
      orderBy: [{ fecha: "asc" }],
    }),
    prisma.concertacionFuncion.findMany({
      where: { user: { ficha: { instructorId: user.id } } },
      select: CONCERTACION_SELECT,
      orderBy: [{ fecha: "asc" }],
    }),
  ]);

  const items = [
    ...concertaciones.map((c) => ({
      id: c.id,
      tipo: "CONCERTACION" as const,
      numero: 1,
      fecha: c.fecha,
      horaInicio: c.horaInicio,
      horaFin: c.horaFin,
      modalidad: null,
      videollamadaUrl: c.videollamadaUrl,
      juicioFinal: null,
      retroalimentacionCoformador: null,
      retroalimentacionInstructor: null,
      retroalimentacionAprendiz: null,
      estado: c.estado,
      fechaAval: c.fechaAval,
      programa: c.user.ficha?.programa ?? null,
      competenciasDesarrollar: c.competenciasDesarrollar,
      resultadosAprendizaje: c.resultadosAprendizaje,
      variables: c.variables,
      user: c.user,
    })),
    ...evaluaciones.map((e) => ({ ...e, tipo: "EVALUACION" as const })),
  ].sort((a, b) => {
    if (!a.fecha || !b.fecha) return 0;
    return +new Date(a.fecha) - +new Date(b.fecha);
  });

  return NextResponse.json({ evaluaciones: items });
}
