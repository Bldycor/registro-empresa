import { NextResponse, after } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { SesionGrupalSchema, convocables, enviarCorreos, guardarSesion, sesionesDelInstructor } from "@/lib/sesiones-grupales";

// Sesiones grupales del instructor (25 nov 2026). GET: sus sesiones y, con ?momento=1|2|3 (y
// ?sesion=id al editar), los aprendices de sus fichas que se pueden convocar. POST: crea una.
export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;
  const url = new URL(request.url);
  const momento = Number(url.searchParams.get("momento"));
  if ([1, 2, 3].includes(momento)) {
    const lista = await convocables(user.id, momento as 1 | 2 | 3, url.searchParams.get("sesion") ?? undefined);
    return NextResponse.json({ convocables: lista });
  }
  return NextResponse.json({ sesiones: await sesionesDelInstructor(user.id) });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;
  const parsed = SesionGrupalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  const instructor = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true } });
  if (!instructor) return NextResponse.json({ error: { _root: ["Usuario no encontrado."] } }, { status: 404 });

  const r = await guardarSesion(instructor, parsed.data);
  if (!r.ok) return NextResponse.json({ error: { [r.campo]: [r.mensaje] } }, { status: r.status });
  // Los correos salen después de responder: con muchos convocados, esperarlos haría lenta la pantalla.
  after(() => enviarCorreos(r.sesionId, r.sesion, r.envios));
  return NextResponse.json({ sesionId: r.sesionId, correos: r.envios.length }, { status: 201 });
}
