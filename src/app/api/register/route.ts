import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/mailer";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    nombres,
    apellidos,
    cedula,
    email,
    celular,
    direccionResidencia,
    role,
    fichaId,
    password,
  } = parsed.data;

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

  // La ficha debe existir de antemano (la precarga el coordinador académico). Si el aprendiz
  // manda un fichaId que ya no existe (p. ej. la seleccionó y alguien la borró justo después),
  // rechazamos el registro en vez de crear una ficha nueva sin control.
  if (role === "APRENDIZ") {
    const ficha = await prisma.ficha.findUnique({ where: { id: fichaId } });
    if (!ficha) {
      return NextResponse.json(
        { error: { fichaId: ["La ficha seleccionada ya no está disponible. Actualiza la página e inténtalo de nuevo."] } },
        { status: 400 }
      );
    }
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
        role,
        // Solo los aprendices tienen ficha; para instructor/coordinador queda en null.
        fichaId: role === "APRENDIZ" ? fichaId : null,
        passwordHash,
      },
    });
  } catch (error) {
    console.error("[api/register] Error al crear el usuario:", error);
    return NextResponse.json(
      { error: { _root: ["Ocurrió un error al crear la cuenta. Inténtalo de nuevo."] } },
      { status: 500 }
    );
  }

  // El correo de bienvenida no debe bloquear el registro: si el envío falla (SMTP
  // caído, etc.), la cuenta ya quedó creada y el usuario puede iniciar sesión igual;
  // solo dejamos el error en el log del servidor para poder revisarlo.
  try {
    await sendWelcomeEmail({ nombres, email, cedula, password, role });
  } catch (error) {
    console.error("[api/register] No se pudo enviar el correo de bienvenida:", error);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
