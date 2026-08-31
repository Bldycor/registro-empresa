import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { EvaluacionRubricaSchema } from "@/lib/validations";

// El instructor registra la evaluación: rúbrica de 13 variables + retroalimentación y, en el
// Momento 3, el juicio final. "Guardar borrador" deja todo editable (estado PENDIENTE);
// "Finalizar evaluación" la cierra (estado APROBADA, con quién y cuándo) y exige la rúbrica
// completa — a partir de ahí el aprendiz ya no puede reagendar la reunión.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.evaluacion.findUnique({
    where: { id },
    select: { id: true, numero: true, user: { select: { ficha: { select: { instructorId: true } } } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Evaluación no encontrada." }, { status: 404 });
  }
  if (existing.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "Solo puedes evaluar a aprendices de tus fichas asignadas." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = EvaluacionRubricaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  if (d.finalizar) {
    const faltantes = d.variables.filter((v) => !v.valoracion);
    if (faltantes.length > 0) {
      return NextResponse.json(
        { error: { _root: ["Valora las 13 variables antes de finalizar la evaluación."] } },
        { status: 400 }
      );
    }
    if (existing.numero === 3 && !d.juicioFinal) {
      return NextResponse.json(
        { error: { juicioFinal: ["El Momento 3 requiere un juicio final."] } },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction([
    ...d.variables.map((v) =>
      prisma.evaluacionVariable.update({
        where: { evaluacionId_variable: { evaluacionId: id, variable: v.variable } },
        data: { valoracion: v.valoracion ?? null, observaciones: v.observaciones || null },
      })
    ),
    prisma.evaluacion.update({
      where: { id },
      data: {
        retroalimentacionInstructor: d.retroalimentacionInstructor || null,
        retroalimentacionCoformador: d.retroalimentacionCoformador || null,
        juicioFinal: d.juicioFinal ?? null,
        estado: d.finalizar ? "APROBADA" : "PENDIENTE",
        avaladoPorId: d.finalizar ? user.id : null,
        fechaAval: d.finalizar ? new Date() : null,
      },
    }),
  ]);

  const evaluacion = await prisma.evaluacion.findUnique({
    where: { id },
    select: {
      id: true,
      estado: true,
      fechaAval: true,
      variables: { select: { variable: true, categoria: true, valoracion: true, observaciones: true } },
    },
  });

  return NextResponse.json({ evaluacion });
}
