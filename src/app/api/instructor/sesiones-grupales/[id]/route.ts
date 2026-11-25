import { NextResponse, after } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { SesionGrupalSchema, cancelarSesion, enviarCorreos, guardarSesion } from "@/lib/sesiones-grupales";

async function instructorDe(id: string) {
  return prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
}

// Cambia fecha, franja, modalidad, lugar o convocados de una sesión que no ha empezado.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;
  const { id } = await params;
  const parsed = SesionGrupalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  const instructor = await instructorDe(user.id);
  if (!instructor) return NextResponse.json({ error: { _root: ["Usuario no encontrado."] } }, { status: 404 });

  const r = await guardarSesion(instructor, parsed.data, id);
  if (!r.ok) return NextResponse.json({ error: { [r.campo]: [r.mensaje] } }, { status: r.status });
  after(() => enviarCorreos(r.sesionId, r.sesion, r.envios));
  return NextResponse.json({ sesionId: r.sesionId, correos: r.envios.length });
}

// Cancela una sesión que no ha empezado: los convocados quedan sin agendar y les llega el aviso.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;
  const { id } = await params;
  const instructor = await instructorDe(user.id);
  if (!instructor) return NextResponse.json({ error: { _root: ["Usuario no encontrado."] } }, { status: 404 });

  const r = await cancelarSesion(instructor, id);
  if (!r.ok) return NextResponse.json({ error: { [r.campo]: [r.mensaje] } }, { status: r.status });
  after(() => enviarCorreos(r.sesionId, r.sesion, r.envios));
  return NextResponse.json({ cancelada: true, correos: r.envios.length });
}
