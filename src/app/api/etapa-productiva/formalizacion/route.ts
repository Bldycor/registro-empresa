import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { FormalizacionSchema } from "@/lib/validations";

const FORMALIZACION_SELECT = {
  id: true,
  tipoDocumento: true,
  fecha: true,
  archivoUrl: true,
  estado: true,
  observaciones: true,
  fechaAval: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Formalización de Etapa Productiva del propio aprendiz — una vigente por aprendiz (se puede
// reemplazar si el instructor la rechaza y el aprendiz vuelve a subirla).
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const formalizacion = await prisma.formalizacionEtapaProductiva.findUnique({
    where: { userId: user.id },
    select: FORMALIZACION_SELECT,
  });

  return NextResponse.json({ formalizacion });
}

// Crea o reemplaza la formalización del aprendiz (upsert: si ya existía una rechazada, la
// reemplaza y vuelve a quedar PENDIENTE).
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = FormalizacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const formalizacion = await prisma.formalizacionEtapaProductiva.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tipoDocumento: d.tipoDocumento,
      fecha: new Date(d.fecha),
      archivoUrl: d.archivoUrl,
    },
    update: {
      tipoDocumento: d.tipoDocumento,
      fecha: new Date(d.fecha),
      archivoUrl: d.archivoUrl,
      estado: "PENDIENTE",
      avaladoPorId: null,
      fechaAval: null,
      observaciones: null,
    },
    select: FORMALIZACION_SELECT,
  });

  return NextResponse.json({ formalizacion }, { status: 201 });
}
