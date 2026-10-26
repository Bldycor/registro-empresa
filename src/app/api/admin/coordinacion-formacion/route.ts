import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CreateCoordinacionFormacionSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/mailer";
import { generarPasswordTemporal } from "@/lib/temp-password";
import { CUENTA_FORMACION_SELECT } from "@/lib/cuentas-formacion";

// Cuentas de Coordinación de Formación: rol de solo consulta (indicadores y reportes de la Etapa
// Productiva) que crea y administra únicamente el ADMIN (decisión del 26 oct 2026).
export async function GET() {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const cuentas = await prisma.user.findMany({
    where: { role: "COORDINADOR_FORMACION" },
    select: CUENTA_FORMACION_SELECT,
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });
  return NextResponse.json({ cuentas });
}

// Mismo mecanismo que las demás cuentas que crea otro rol: contraseña inicial = cédula (riesgo
// aceptado por Coordinación), enviada en el correo de bienvenida y devuelta una vez aquí.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const parsed = CreateCoordinacionFormacionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { nombres, apellidos, cedula, email, celular, direccionResidencia, comuna } = parsed.data;

  const existente = await prisma.user.findFirst({ where: { OR: [{ email }, { cedula }] } });
  if (existente) {
    const campo = existente.email === email ? "email" : "cedula";
    return NextResponse.json(
      {
        error: {
          [campo]: [campo === "email" ? "Ya existe una cuenta con este correo." : "Ya existe una cuenta con esta cédula."],
        },
      },
      { status: 409 },
    );
  }

  const password = generarPasswordTemporal(cedula);
  const cuenta = await prisma.user.create({
    data: {
      nombres,
      apellidos,
      cedula,
      email,
      celular,
      direccionResidencia,
      comuna,
      role: "COORDINADOR_FORMACION",
      passwordHash: await bcrypt.hash(password, 10),
      creadoPorId: user.id,
    },
    select: CUENTA_FORMACION_SELECT,
  });

  try {
    await sendWelcomeEmail({ nombres, email, cedula, password, role: "COORDINADOR_FORMACION" });
  } catch (error) {
    console.error("[api/admin/coordinacion-formacion] No se pudo enviar el correo de bienvenida:", error);
  }

  return NextResponse.json({ cuenta, password }, { status: 201 });
}
