import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CreateCoordinacionFormacionSchema } from "@/lib/validations";
import { CUENTA_FORMACION_SELECT } from "@/lib/cuentas-formacion";

// Corregir los datos de una cuenta de Coordinación de Formación. La contraseña no se toca aquí:
// la cambia el administrador desde «Contraseñas» o la persona con «¿Olvidaste tu contraseña?».
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const { id } = await params;
  const actual = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (actual?.role !== "COORDINADOR_FORMACION") {
    return NextResponse.json({ error: { _root: ["La cuenta no existe."] } }, { status: 404 });
  }

  const parsed = CreateCoordinacionFormacionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const datos = parsed.data;

  const duplicado = await prisma.user.findFirst({
    where: { id: { not: id }, OR: [{ email: datos.email }, { cedula: datos.cedula }] },
  });
  if (duplicado) {
    const campo = duplicado.email === datos.email ? "email" : "cedula";
    return NextResponse.json(
      {
        error: {
          [campo]: [campo === "email" ? "Ya existe otra cuenta con este correo." : "Ya existe otra cuenta con esta cédula."],
        },
      },
      { status: 409 },
    );
  }

  const cuenta = await prisma.user.update({ where: { id }, data: datos, select: CUENTA_FORMACION_SELECT });
  return NextResponse.json({ cuenta });
}
