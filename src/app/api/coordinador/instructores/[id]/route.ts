import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CreateInstructorSchema } from "@/lib/validations";

// Editar los datos de un instructor ya creado (el coordinador es quien los mantiene al día;
// el instructor no tiene un formulario propio de datos personales todavía). No toca la
// contraseña — eso sigue siendo autoservicio del instructor vía "¿Olvidaste tu contraseña?".
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: { _root: ["El instructor no existe."] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = CreateInstructorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
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

  const instructor = await prisma.user.update({
    where: { id },
    data: { nombres, apellidos, cedula, email, celular, direccionResidencia, comuna, coordinacion },
    select: {
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
    },
  });

  return NextResponse.json({ instructor });
}

// Elimina la cuenta del instructor (login, datos personales). Las fichas que tenía asignadas NO
// se borran — solo quedan sin instructor (instructorId a null), igual que al eliminar una ficha
// se desvinculan sus aprendices sin borrar sus cuentas (ver docs/PLAN-IMPLEMENTACION.md).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existing || existing.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "El instructor no existe." }, { status: 404 });
  }

  const [{ count: fichasDesvinculadas }] = await prisma.$transaction([
    prisma.ficha.updateMany({ where: { instructorId: id }, data: { instructorId: null } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true, fichasDesvinculadas });
}
