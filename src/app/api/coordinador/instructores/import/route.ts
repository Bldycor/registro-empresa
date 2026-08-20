import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { parseInstructorImportText } from "@/lib/instructor-import";
import { generarPasswordTemporal } from "@/lib/temp-password";
import { sendWelcomeEmail } from "@/lib/mailer";

// Importación masiva de instructores desde una hoja de cálculo (pegar texto separado por
// tabulaciones, con o sin fila de encabezado — ver src/lib/instructor-import.ts). Igual que la
// importación de fichas: solo CREA cuentas nuevas — si la cédula o el correo ya existen en el
// sistema (de cualquier rol, no solo instructor), no se toca esa fila y se reporta aparte.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto : "";

  if (!texto.trim()) {
    return NextResponse.json({ error: "Pega el contenido de la hoja de cálculo." }, { status: 400 });
  }

  const { filas, errores } = parseInstructorImportText(texto);

  const cedulasEnLote = filas.map((f) => f.cedula);
  const emailsEnLote = filas.map((f) => f.email);
  const existentes = await prisma.user.findMany({
    where: { OR: [{ cedula: { in: cedulasEnLote } }, { email: { in: emailsEnLote } }] },
    select: { cedula: true, email: true },
  });
  const cedulasExistentes = new Set(existentes.map((u) => u.cedula));
  const emailsExistentes = new Set(existentes.map((u) => u.email));

  const creadas: { nombres: string; apellidos: string; email: string; password: string }[] = [];
  const yaExistian: string[] = [];
  const erroresGuardado: { identificador: string; motivo: string }[] = [];

  // Cédulas/correos ya usados dentro del propio lote pegado (para no intentar crear dos veces
  // el mismo antes de que la primera fila siquiera llegue a la base de datos).
  const cedulasProcesadas = new Set<string>();
  const emailsProcesados = new Set<string>();

  for (const fila of filas) {
    const identificador = `${fila.nombres} ${fila.apellidos} (${fila.cedula})`;

    if (
      cedulasExistentes.has(fila.cedula) ||
      emailsExistentes.has(fila.email) ||
      cedulasProcesadas.has(fila.cedula) ||
      emailsProcesados.has(fila.email)
    ) {
      yaExistian.push(identificador);
      continue;
    }
    cedulasProcesadas.add(fila.cedula);
    emailsProcesados.add(fila.email);

    const password = generarPasswordTemporal(fila.cedula);
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      await prisma.user.create({
        data: {
          nombres: fila.nombres,
          apellidos: fila.apellidos,
          cedula: fila.cedula,
          email: fila.email,
          celular: fila.celular,
          direccionResidencia: fila.direccionResidencia,
          comuna: fila.comuna,
          coordinacion: fila.coordinacion,
          role: "INSTRUCTOR",
          passwordHash,
          creadoPorId: user.id,
        },
      });
      creadas.push({ nombres: fila.nombres, apellidos: fila.apellidos, email: fila.email, password });
    } catch (error) {
      console.error("[api/coordinador/instructores/import] Error al guardar instructor:", identificador, error);
      erroresGuardado.push({ identificador, motivo: "Error inesperado al guardar." });
    }
  }

  // El envío de correos no bloquea la respuesta: si falla, las cuentas ya quedaron creadas y las
  // contraseñas se devuelven igual en la respuesta como respaldo.
  await Promise.allSettled(
    creadas.map((c) =>
      sendWelcomeEmail({
        nombres: c.nombres,
        email: c.email,
        cedula: filas.find((f) => f.email === c.email)?.cedula ?? "",
        password: c.password,
        role: "INSTRUCTOR",
      })
    )
  );

  return NextResponse.json({
    creadas,
    yaExistian,
    errores: [
      ...errores.map((e) => ({ motivo: `Línea ${e.linea}: ${e.motivo}` })),
      ...erroresGuardado.map((e) => ({ motivo: `${e.identificador}: ${e.motivo}` })),
    ],
  });
}
