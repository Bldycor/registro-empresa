import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { NovedadBitacoraSchema } from "@/lib/validations";

// El aprendiz deja constancia de en qué bitácora anotó la novedad (guía GFPI-G-040 §9.2: dentro
// de los 5 días hábiles siguientes al hecho). Solo sobre sus propias novedades, y una sola vez:
// la fecha de la constancia es la que mide el plazo.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const { id } = await params;
  const parsed = NovedadBitacoraSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existente = await prisma.novedadEtapaProductiva.findUnique({
    where: { id },
    select: { userId: true, fechaAnotacionBitacora: true },
  });
  if (!existente || existente.userId !== user.id) {
    return NextResponse.json({ error: "Novedad no encontrada." }, { status: 404 });
  }
  if (existente.fechaAnotacionBitacora) {
    return NextResponse.json({ error: "Esta novedad ya quedó anotada en una bitácora." }, { status: 409 });
  }

  const novedad = await prisma.novedadEtapaProductiva.update({
    where: { id },
    data: { bitacoraNumero: parsed.data.bitacoraNumero, fechaAnotacionBitacora: new Date() },
    select: { id: true, bitacoraNumero: true, fechaAnotacionBitacora: true },
  });

  return NextResponse.json({ novedad });
}
