import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CreateInstructorSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/mailer";
import { generarPasswordTemporal } from "@/lib/temp-password";

// Lista de instructores para el selector de asignación de fichas y para el panel de gestión
// de instructores del coordinador. ADMIN también tiene acceso (control total).
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
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
      fichasAsignadas: {
        select: {
          id: true,
          codigo: true,
          _count: { select: { aprendices: true } },
          aprendices: {
            select: { id: true, nombres: true, apellidos: true },
            orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
          },
        },
      },
      creadoPorId: true,
      creadoPor: { select: { id: true, nombres: true, apellidos: true } },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return NextResponse.json({ instructores });
}

// El Instructor no se autoregistra: sus datos los ingresa el Coordinador al cual pertenece (o el
// ADMIN, que tiene control total). Se crea con una contraseña temporal autogenerada, enviada por
// correo (mismo mecanismo que el correo de bienvenida del autoregistro) y devuelta una sola vez
// en la respuesta, por si quien lo crea necesita comunicarla directamente. Queda registrado quién
// lo creó (creadoPorId) para trazabilidad.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
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

  const password = generarPasswordTemporal(cedula);
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
        creadoPorId: user.id,
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
        creadoPorId: true,
        creadoPor: { select: { id: true, nombres: true, apellidos: true } },
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
