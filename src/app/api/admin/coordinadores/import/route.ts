import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
// Mismo parser que la importación de instructores: idéntica forma de fila (nombres, apellidos,
// cédula, correo, celular, dirección, comuna, coordinación), solo cambia el rol asignado.
import { parseInstructorImportText } from "@/lib/instructor-import";
import { generarPasswordTemporal } from "@/lib/temp-password";
import { sendWelcomeEmail } from "@/lib/mailer";

// Importación masiva de coordinadores desde una hoja de cálculo. Solo el ADMIN puede usarla.
// Igual que la importación de instructores: solo CREA cuentas nuevas — si la cédula o el correo
// ya existen (de cualquier rol), esa fila no se toca y se reporta aparte.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN"]);
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
          role: "COORDINADOR",
          passwordHash,
          creadoPorId: user.id,
        },
      });
      creadas.push({ nombres: fila.nombres, apellidos: fila.apellidos, email: fila.email, password });
    } catch (error) {
      console.error("[api/admin/coordinadores/import] Error al guardar coordinador:", identificador, error);
      erroresGuardado.push({ identificador, motivo: "Error inesperado al guardar." });
    }
  }

  await Promise.allSettled(
    creadas.map((c) =>
      sendWelcomeEmail({
        nombres: c.nombres,
        email: c.email,
        cedula: filas.find((f) => f.email === c.email)?.cedula ?? "",
        password: c.password,
        role: "COORDINADOR",
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
