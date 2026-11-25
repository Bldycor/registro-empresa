import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterAprendizSchema } from "@/lib/validations";
import { sendWelcomeEmail } from "@/lib/mailer";
import { registrarAuditoria } from "@/lib/auditoria";
import { POLITICA_DATOS } from "@/lib/proteccion-datos";

// Registro público de Aprendiz — el único autoregistro que queda. El ADMIN crea Coordinador
// (/api/admin/coordinadores) y el Coordinador crea Instructor (/api/coordinador/instructores);
// ninguno de los dos tiene autoregistro público.
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
    departamento,
    ciudad,
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

  let nuevoId: string;
  try {
    ({ id: nuevoId } = await prisma.user.create({
      data: {
        nombres,
        apellidos,
        cedula,
        email,
        celular,
        direccionResidencia,
        departamento,
        ciudad,
        role: "APRENDIZ",
        fichaId,
        alternativaEtapaProductiva,
        passwordHash,
      },
      select: { id: true },
    }));
  } catch (error) {
    console.error("[api/register] Error al crear el usuario:", error);
    return NextResponse.json(
      { error: { _root: ["Ocurrió un error al crear la cuenta. Inténtalo de nuevo."] } },
      { status: 500 }
    );
  }

  // Constancia de la autorización del tratamiento de datos (Ley 1581 de 2012; política del SENA,
  // Acuerdo 13 de 2019: el responsable debe conservar prueba de la autorización).
  await registrarAuditoria({
    accion: "AUTORIZACION_DATOS",
    entidad: "User",
    entidadId: nuevoId,
    detalle: { autoriza: true, politica: POLITICA_DATOS.map((p) => p.nombre) },
    actor: { id: nuevoId, nombre: `${nombres} ${apellidos}`, rol: "APRENDIZ", ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null },
  });

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
