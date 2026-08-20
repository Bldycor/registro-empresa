import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CreateCoordinadorSchema } from "@/lib/validations";

const COORDINADOR_SELECT = {
  id: true,
  nombres: true,
  apellidos: true,
  cedula: true,
  email: true,
  celular: true,
  direccionResidencia: true,
  comuna: true,
  coordinacion: true,
  creadoPorId: true,
  creadoPor: { select: { id: true, nombres: true, apellidos: true } },
} as const;

// Editar los datos de un coordinador ya creado. No toca la contraseña — eso sigue siendo
// autoservicio del coordinador vía "¿Olvidaste tu contraseña?".
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== "COORDINADOR") {
    return NextResponse.json({ error: { _root: ["El coordinador no existe."] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = CreateCoordinadorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nombres, apellidos, cedula, email, celular, direccionResidencia, comuna, coordinacion } =
    parsed.data;

  const duplicado = await prisma.user.findFirst({
    where: { id: { not: id }, OR: [{ email }, { cedula }] },
  });
  if (duplicado) {
    const field = duplicado.email === email ? "email" : "cedula";
    return NextResponse.json(
      {
        error: {
          [field]: [
            field === "email"
              ? "Ya existe otra cuenta con este correo."
              : "Ya existe otra cuenta con esta cédula.",
          ],
        },
      },
      { status: 409 }
    );
  }

  const coordinador = await prisma.user.update({
    where: { id },
    data: { nombres, apellidos, cedula, email, celular, direccionResidencia, comuna, coordinacion },
    select: COORDINADOR_SELECT,
  });

  return NextResponse.json({ coordinador });
}

// Elimina la cuenta del coordinador (login, datos personales). No hay relaciones que desvincular
// (a diferencia de Ficha/Instructor): si este coordinador había creado cuentas, esas cuentas
// conservan sus datos, solo pierden la referencia de quién las creó (creadoPorId → null).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existing || existing.role !== "COORDINADOR") {
    return NextResponse.json({ error: "El coordinador no existe." }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
