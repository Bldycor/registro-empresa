import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CreateAprendizSchema } from "@/lib/validations";
import { generarPasswordTemporal } from "@/lib/temp-password";
import { sendWelcomeEmail } from "@/lib/mailer";

// Crea un aprendiz individual desde el panel de Coordinador/Admin — a diferencia del mismo
// formulario en el panel del Instructor, acá no hay restricción de "solo mis fichas asignadas":
// Coordinador y Admin gestionan cualquier ficha del sistema. Mismo patrón del resto de la app:
// sin autoregistro, contraseña temporal = cédula, enviada por correo.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = CreateAprendizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const ficha = await prisma.ficha.findUnique({ where: { id: d.fichaId }, select: { id: true } });
  if (!ficha) {
    return NextResponse.json(
      { error: { fichaId: ["Esa ficha ya no existe."] } },
      { status: 404 },
    );
  }

  const duplicado = await prisma.user.findFirst({
    where: { OR: [{ email: d.email }, { cedula: d.cedula }] },
  });
  if (duplicado) {
    const field = duplicado.email === d.email ? "email" : "cedula";
    return NextResponse.json(
      {
        error: {
          [field]:
            field === "email"
              ? ["Ya existe otra cuenta con este correo."]
              : ["Ya existe otra cuenta con esta cédula."],
        },
      },
      { status: 409 },
    );
  }

  const password = generarPasswordTemporal(d.cedula);
  const passwordHash = await bcrypt.hash(password, 10);

  const aprendiz = await prisma.user.create({
    data: {
      nombres: d.nombres,
      apellidos: d.apellidos,
      cedula: d.cedula,
      email: d.email,
      celular: d.celular,
      direccionResidencia: d.direccionResidencia,
      comuna: d.comuna,
      role: "APRENDIZ",
      fichaId: d.fichaId,
      alternativaEtapaProductiva: d.alternativaEtapaProductiva,
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
      estado: true,
      alternativaEtapaProductiva: true,
      fichaId: true,
      ficha: { select: { id: true, codigo: true } },
    },
  });

  await sendWelcomeEmail({
    nombres: aprendiz.nombres,
    email: aprendiz.email,
    cedula: aprendiz.cedula,
    password,
    role: "APRENDIZ",
  }).catch((error) => {
    console.error("[api/coordinador/aprendices/create] No se pudo enviar el correo de bienvenida:", error);
  });

  return NextResponse.json({ aprendiz, password }, { status: 201 });
}
