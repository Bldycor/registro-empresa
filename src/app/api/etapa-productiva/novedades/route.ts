import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { NovedadEPSchema } from "@/lib/validations";
import { cargarNovedades } from "@/lib/novedades";
import { fechaEnColombia } from "@/lib/plazos-institucionales";

function toDateOnly(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

// Novedades del propio aprendiz (guía GFPI-G-040 §9.2), incluidas sus interrupciones y
// aplazamientos, que la guía también cuenta como novedades.
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  return NextResponse.json({ novedades: await cargarNovedades({ userId: user.id }) });
}

// El aprendiz registra una novedad que afecta su práctica sin detenerla. No se avala: queda como
// constancia con su fecha, y el sistema muestra si se registró dentro de los 3 días hábiles.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const parsed = NovedadEPSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  if (d.fechaHecho > fechaEnColombia(new Date())) {
    return NextResponse.json({ error: { fechaHecho: ["La fecha no puede ser en el futuro."] } }, { status: 400 });
  }

  const novedad = await prisma.novedadEtapaProductiva.create({
    data: {
      userId: user.id,
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
