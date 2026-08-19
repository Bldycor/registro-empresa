import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterCoordinadorSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/mailer";

// Registro público de Coordinador, separado del de Aprendiz (/api/register). No hay validación
// adicional de "quién puede ser coordinador" más allá de la cuenta institucional (correo/cédula
// únicos) — es una autoregistración de confianza, igual que era antes para este rol.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RegisterCoordinadorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { nombres, apellidos, cedula, email, celular, direccionResidencia, comuna, coordinacion, password } =
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

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
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
      },
    });
  } catch (error) {
    console.error("[api/register-coordinador] Error al crear el usuario:", error);
    return NextResponse.json(
      { error: { _root: ["Ocurrió un error al crear la cuenta. Inténtalo de nuevo."] } },
      { status: 500 }
    );
  }

  try {
    await sendWelcomeEmail({ nombres, email, cedula, password, role: "COORDINADOR" });
  } catch (error) {
    console.error("[api/register-coordinador] No se pudo enviar el correo de bienvenida:", error);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
