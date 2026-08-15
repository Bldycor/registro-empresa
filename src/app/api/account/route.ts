import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PersonalUpdateSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      nombres: true,
      apellidos: true,
      cedula: true,
      codigoFicha: true,
      email: true,
      celular: true,
      direccionResidencia: true,
    },
  });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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
  if (existingEmail && existingEmail.id !== session.user.id) {
    return NextResponse.json(
      { error: { email: ["Ya existe una cuenta con este correo."] } },
      { status: 409 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { email, celular, direccionResidencia },
    select: {
      nombres: true,
      apellidos: true,
      cedula: true,
      codigoFicha: true,
      email: true,
      celular: true,
      direccionResidencia: true,
    },
  });

  return NextResponse.json({ user });
}
