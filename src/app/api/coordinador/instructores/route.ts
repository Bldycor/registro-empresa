import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CreateInstructorSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/mailer";

// Lista de instructores para el selector de asignación de fichas y para el panel de gestión
// de instructores del coordinador.
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR"]);
  if (!user) return response;

  const instructores = await prisma.user.findMany({
    where: { role: "INSTRUCTOR" },
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
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return NextResponse.json({ instructores });
}

function generarPasswordTemporal() {
  // Legible (sin caracteres ambiguos) y suficientemente larga para pasar la validación de
  // contraseña (mínimo 8) sin quedar críptica al copiarla/transcribirla a mano.
  return randomBytes(9).toString("base64url");
}

// El Instructor no se autoregistra: sus datos los ingresa el Coordinador al cual pertenece.
// Se crea con una contraseña temporal autogenerada, enviada por correo (mismo mecanismo que el
// correo de bienvenida del autoregistro) y devuelta una sola vez en la respuesta, por si el
// coordinador necesita comunicarla directamente.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR"]);
  if (!user) return response;

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

  const password = generarPasswordTemporal();
  const passwordHash = await bcrypt.hash(password, 10);

  let instructor;
  try {
    instructor = await prisma.user.create({
      data: {
        nombres,
        apellidos,
        cedula,
        email,
        celular,
        direccionResidencia,
        comuna,
        coordinacion,
        role: "INSTRUCTOR",
        passwordHash,
      },
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
      },
    });
  } catch (error) {
    console.error("[api/coordinador/instructores] Error al crear el instructor:", error);
    return NextResponse.json(
      { error: { _root: ["Ocurrió un error al crear el instructor. Inténtalo de nuevo."] } },
      { status: 500 }
    );
  }

  try {
    await sendWelcomeEmail({ nombres, email, cedula, password, role: "INSTRUCTOR" });
  } catch (error) {
    console.error("[api/coordinador/instructores] No se pudo enviar el correo de bienvenida:", error);
  }

  return NextResponse.json({ instructor, password }, { status: 201 });
}
