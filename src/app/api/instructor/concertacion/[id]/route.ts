import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { ConcertacionRubricaSchema } from "@/lib/validations";

// El instructor valora el Momento 1 (Concertación): 6 variables sobre la calidad de la
// planeación acordada. Mismo patrón que la evaluación de Momentos 2/3 — "Guardar borrador" deja
// todo editable (estado PENDIENTE); "Finalizar valoración" la cierra (estado APROBADA) y exige
// las 6 variables valoradas. Usa upsert por variable porque, a diferencia de `EvaluacionVariable`,
// las filas de `ConcertacionVariable` no se precrean al agendar la cita.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.concertacionFuncion.findUnique({
    where: { id },
    select: { id: true, user: { select: { ficha: { select: { instructorId: true } } } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Concertación no encontrada." }, { status: 404 });
  }
  if (existing.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "Solo puedes valorar a aprendices de tus fichas asignadas." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = ConcertacionRubricaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  if (d.finalizar) {
    const faltantes = d.variables.filter((v) => !v.valoracion);
    if (faltantes.length > 0) {
      return NextResponse.json(
        { error: { _root: ["Valora las 6 variables antes de finalizar."] } },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction([
    ...d.variables.map((v) =>
      prisma.concertacionVariable.upsert({
        where: { concertacionId_variable: { concertacionId: id, variable: v.variable } },
        create: {
          concertacionId: id,
          variable: v.variable,
          valoracion: v.valoracion ?? null,
          observaciones: v.observaciones || null,
        },
        update: { valoracion: v.valoracion ?? null, observaciones: v.observaciones || null },
      })
    ),
    prisma.concertacionFuncion.update({
      where: { id },
      data: {
        competenciasDesarrollar: d.competenciasDesarrollar || null,
        resultadosAprendizaje: d.resultadosAprendizaje || null,
        estado: d.finalizar ? "APROBADA" : "PENDIENTE",
        avaladoPorId: d.finalizar ? user.id : null,
        fechaAval: d.finalizar ? new Date() : null,
      },
    }),
  ]);

  const concertacion = await prisma.concertacionFuncion.findUnique({
    where: { id },
    select: {
      id: true,
      estado: true,
      fechaAval: true,
      competenciasDesarrollar: true,
      resultadosAprendizaje: true,
      variables: { select: { variable: true, valoracion: true, observaciones: true } },
    },
  });

  return NextResponse.json({ concertacion });
}
