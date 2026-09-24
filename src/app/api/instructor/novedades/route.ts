import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { NovedadEPInstructorSchema } from "@/lib/validations";
import { cargarNovedades } from "@/lib/novedades";
import { fechaEnColombia } from "@/lib/plazos-institucionales";

function toDateOnly(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

// Novedades de los aprendices de las fichas del instructor (guía GFPI-G-040 §9.2).
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  return NextResponse.json({ novedades: await cargarNovedades({ instructorId: user.id }) });
}

// El instructor también puede dejar el registro, cuando se entera antes que el aprendiz
// (decisión de Coordinación, 24 sep 2026). Solo de aprendices de sus fichas.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const parsed = NovedadEPInstructorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  if (d.fechaHecho > fechaEnColombia(new Date())) {
    return NextResponse.json({ error: { fechaHecho: ["La fecha no puede ser en el futuro."] } }, { status: 400 });
  }

  const aprendiz = await prisma.user.findUnique({
    where: { id: d.userId },
    select: { role: true, ficha: { select: { instructorId: true } } },
  });
  if (!aprendiz || aprendiz.role !== "APRENDIZ") {
    return NextResponse.json({ error: { userId: ["El aprendiz no existe."] } }, { status: 404 });
  }
  if (aprendiz.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: { userId: ["Solo puedes registrar novedades de aprendices de tus fichas."] } },
      { status: 403 },
    );
  }

  const novedad = await prisma.novedadEtapaProductiva.create({
    data: {
      userId: d.userId,
      tipo: d.tipo,
      descripcion: d.descripcion,
      fechaHecho: toDateOnly(d.fechaHecho),
      soporteUrl: d.soporteUrl || null,
      registradaPorId: user.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ novedad }, { status: 201 });
}
