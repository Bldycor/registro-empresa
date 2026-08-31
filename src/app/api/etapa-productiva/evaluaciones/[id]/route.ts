import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EvaluacionRetroAprendizSchema } from "@/lib/validations";

// El aprendiz agrega/edita su propia reflexión (Momento 3) — el resto de la evaluación es
// solo lectura para él, la diligencia el instructor.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json();
  const parsed = EvaluacionRetroAprendizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.evaluacion.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Evaluación no encontrada." }, { status: 404 });
  }

  const evaluacion = await prisma.evaluacion.update({
    where: { id },
    data: { retroalimentacionAprendiz: parsed.data.retroalimentacionAprendiz },
    select: { id: true, retroalimentacionAprendiz: true },
  });

  return NextResponse.json({ evaluacion });
}
