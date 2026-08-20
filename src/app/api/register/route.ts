import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterAprendizSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/mailer";

// Registro público de Aprendiz. Instructor y Coordinador ya no pasan por aquí: el Coordinador
// se autoregistra en /api/register-coordinador, y el Instructor lo crea el Coordinador desde
// su panel (/api/coordinador/instructores).
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = RegisterAprendizSchema.safeParse(body);

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
    comuna,
    fichaId,
    alternativaEtapaProductiva,
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
  const ficha = await prisma.ficha.findUnique({ where: { id: fichaId } });
  if (!ficha) {
    return NextResponse.json(
      { error: { fichaId: ["La ficha seleccionada ya no está disponible. Actualiza la página e inténtalo de nuevo."] } },
      { status: 400 }
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
        role: "APRENDIZ",
        fichaId,
        alternativaEtapaProductiva,
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
    await sendWelcomeEmail({ nombres, email, cedula, password, role: "APRENDIZ" });
  } catch (error) {
    console.error("[api/register] No se pudo enviar el correo de bienvenida:", error);
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
