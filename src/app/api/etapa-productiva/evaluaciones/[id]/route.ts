import { requireApiUser } from "@/lib/auth-guards";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EvaluacionRetroAprendizSchema } from "@/lib/validations";

// El aprendiz agrega/edita su propia reflexión (Momento 3) — el resto de la evaluación es
// solo lectura para él, la diligencia el instructor.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user: sesion, response } = await requireApiUser(["APRENDIZ"]);
  if (!sesion) return response;

  const { id } = await params;

  const body = await request.json();
  const parsed = EvaluacionRetroAprendizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existing = await prisma.evaluacion.findUnique({ where: { id }, select: { userId: true } });
  if (!existing || existing.userId !== sesion.id) {
    return NextResponse.json({ error: "Evaluación no encontrada." }, { status: 404 });
  }

  const evaluacion = await prisma.evaluacion.update({
    where: { id },
    data: { retroalimentacionAprendiz: parsed.data.retroalimentacionAprendiz },
    select: { id: true, retroalimentacionAprendiz: true },
  });

  return NextResponse.json({ evaluacion });
}
