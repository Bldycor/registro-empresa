import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { z } from "zod";

const AvalSchema = z.object({
  estado: z.enum(["APROBADA", "RECHAZADA"]),
  observacionesAval: z.string().trim().nullable().optional(),
});

// Avala o rechaza una solicitud de Alternativa EP — mismo comportamiento que la ruta del
// Coordinador, pero solo si el aprendiz pertenece a una ficha asignada a este instructor.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.seleccionAlternativaEP.findUnique({
    where: { id },
    select: { id: true, userId: true, alternativa: true, subtipoAlternativa: true, fechaInicioEjecucion: true, fechaFinEjecucion: true, user: { select: { ficha: { select: { instructorId: true } } } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  }
  if (existing.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "Solo puedes avalar solicitudes de aprendices de tus fichas asignadas." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = AvalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const seleccion = await prisma.$transaction(async (tx) => {
    const updated = await tx.seleccionAlternativaEP.update({
      where: { id },
      data: {
        estado: d.estado,
        avaladoPorId: user.id,
        fechaAval: new Date(),
        observacionesAval: d.observacionesAval ?? null,
      },
    });

    if (d.estado === "APROBADA") {
      await tx.user.update({
        where: { id: updated.userId },
        data: {
          alternativaEtapaProductiva: updated.alternativa,
          subtipoAlternativaEtapaProductiva: updated.subtipoAlternativa,
          fechaInicioEtapaProductiva: updated.fechaInicioEjecucion,
          fechaFinEtapaProductiva: updated.fechaFinEjecucion,
        },
      });
    }

    return updated;
  });

  return NextResponse.json({ seleccion });
}
