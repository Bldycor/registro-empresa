import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CreateCoordinadorSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/mailer";
import { generarPasswordTemporal } from "@/lib/temp-password";

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

// Lista de coordinadores para el panel de administración. Solo el ADMIN puede ver/gestionar
// esta lista — el Coordinador no se autoregistra ni se autogestiona (ver docs/PLAN-IMPLEMENTACION.md).
export async function GET() {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const coordinadores = await prisma.user.findMany({
    where: { role: "COORDINADOR" },
    select: COORDINADOR_SELECT,
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return NextResponse.json({ coordinadores });
}

// El Coordinador no se autoregistra: lo crea el Administrador. Mismo mecanismo que el Coordinador
// creando Instructores — contraseña temporal autogenerada, enviada por correo y devuelta una vez
// en la respuesta. Queda registrado quién lo creó (creadoPorId) para trazabilidad.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = CreateCoordinadorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { nombres, apellidos, cedula, email, celular, direccionResidencia, comuna, coordinacion } =
    parsed.data;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { cedula }] },
  });
  if (existingUser) {
    const field = existingUser.email === email ? "email" : "cedula";
    return NextResponse.json(
      {
        error: {
          [field]: [
            field === "email"
              ? "Ya existe una cuenta con este correo."
              : "Ya existe una cuenta con esta cédula.",
          ],
        },
      },
      { status: 409 }
    );
  }

  const password = generarPasswordTemporal(cedula);
  const passwordHash = await bcrypt.hash(password, 10);

  let coordinador;
  try {
    coordinador = await prisma.user.create({
      data: {
        nombres,
        apellidos,
        cedula,
        email,
        celular,
        direccionResidencia,
        comuna,
        coordinacion,
        role: "COORDINADOR",
        passwordHash,
        creadoPorId: user.id,
      },
      select: COORDINADOR_SELECT,
    });
  } catch (error) {
    console.error("[api/admin/coordinadores] Error al crear el coordinador:", error);
    return NextResponse.json(
      { error: { _root: ["Ocurrió un error al crear el coordinador. Inténtalo de nuevo."] } },
      { status: 500 }
    );
  }

  try {
    await sendWelcomeEmail({ nombres, email, cedula, password, role: "COORDINADOR" });
  } catch (error) {
    console.error("[api/admin/coordinadores] No se pudo enviar el correo de bienvenida:", error);
  }

  return NextResponse.json({ coordinador, password }, { status: 201 });
}
