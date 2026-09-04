import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { z } from "zod";

const AvalSchema = z.object({
  estado: z.enum(["APROBADA", "RECHAZADA"]),
  observaciones: z.string().trim().nullable().optional(),
});

// Avala o rechaza la certificación del empresario de un aprendiz — solo el instructor asignado a
// la ficha de ese aprendiz puede hacerlo (misma regla que el resto de la app). El paso del
// aprendiz a estado Certificado sigue siendo manual (ver panel de Aprendices), no automático.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.certificacionEmpresario.findUnique({
    where: { id },
    select: { id: true, user: { select: { ficha: { select: { instructorId: true } } } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "La certificación no existe." }, { status: 404 });
  }
  if (existing.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "No autorizado: este aprendiz no está en tus fichas asignadas." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = AvalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const certificacion = await prisma.certificacionEmpresario.update({
    where: { id },
    data: {
      estado: d.estado,
      avaladoPorId: user.id,
      fechaAval: new Date(),
      observaciones: d.observaciones ?? null,
    },
  });

  return NextResponse.json({ certificacion });
}
