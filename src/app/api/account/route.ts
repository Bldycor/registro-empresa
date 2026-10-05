import { requireApiUser } from "@/lib/auth-guards";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PersonalUpdateSchema } from "@/lib/validations";

export async function GET() {
  const { user: sesion, response } = await requireApiUser();
  if (!sesion) return response;

  const user = await prisma.user.findUnique({
    where: { id: sesion.id },
    select: {
      nombres: true,
      apellidos: true,
      cedula: true,
      ficha: { select: { codigo: true } },
      email: true,
      celular: true,
      direccionResidencia: true,
    },
  });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const { user: sesion, response } = await requireApiUser();
  if (!sesion) return response;

  const body = await request.json();
  const parsed = PersonalUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, celular, direccionResidencia } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail && existingEmail.id !== sesion.id) {
    return NextResponse.json(
      { error: { email: ["Ya existe una cuenta con este correo."] } },
      { status: 409 }
    );
  }

  const user = await prisma.user.update({
    where: { id: sesion.id },
    data: { email, celular, direccionResidencia },
    select: {
      nombres: true,
      apellidos: true,
      cedula: true,
      ficha: { select: { codigo: true } },
      email: true,
      celular: true,
      direccionResidencia: true,
    },
  });

  return NextResponse.json({ user });
}
