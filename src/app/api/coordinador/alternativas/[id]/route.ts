import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { z } from "zod";

const AvalSchema = z.object({
  estado: z.enum(["APROBADA", "RECHAZADA"]),
  observacionesAval: z.string().trim().nullable().optional(),
});

// Avala o rechaza una solicitud de selección/modificación de alternativa. Al aprobar, sincroniza
// los campos vigentes del aprendiz (alternativa, subtipo y fechas de Etapa Productiva) — son la
// única fuente de esos campos en User, nunca se editan directamente en otro formulario.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.seleccionAlternativaEP.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
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
