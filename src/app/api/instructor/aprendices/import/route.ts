import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { parseAprendizImportText } from "@/lib/aprendiz-import";
import { generarPasswordTemporal } from "@/lib/temp-password";
import { sendWelcomeEmail } from "@/lib/mailer";

// Importación masiva de aprendices desde una hoja de cálculo, solo en fichas asignadas al
// instructor. Mismo patrón "solo crea" que fichas/instructores: si la cédula o el correo ya
// existen (de cualquier rol), no se toca esa fila y se reporta aparte. La hoja real no trae
// dirección de residencia ni comuna — quedan como "Sin especificar" / sin comuna, editables
// después desde el panel del coordinador/admin.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto : "";

  if (!texto.trim()) {
    return NextResponse.json({ error: "Pega el contenido de la hoja de cálculo." }, { status: 400 });
  }

  const { filas, errores: erroresParseo } = parseAprendizImportText(texto);

  const fichasCodigos = Array.from(new Set(filas.map((f) => f.fichaCodigo)));
  const fichas = await prisma.ficha.findMany({
    where: { codigo: { in: fichasCodigos } },
    select: { id: true, codigo: true, instructorId: true },
  });
  const fichaPorCodigo = new Map(fichas.map((f) => [f.codigo, f]));

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
    const ficha = fichaPorCodigo.get(fila.fichaCodigo);

    if (!ficha) {
      erroresGuardado.push({ identificador, motivo: `La ficha "${fila.fichaCodigo}" no existe en el sistema.` });
      continue;
    }
    if (ficha.instructorId !== user.id) {
      erroresGuardado.push({
        identificador,
        motivo: `La ficha "${fila.fichaCodigo}" no está asignada a tu cuenta.`,
      });
      continue;
    }

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
          direccionResidencia: "Sin especificar",
          role: "APRENDIZ",
          fichaId: ficha.id,
          alternativaEtapaProductiva: fila.alternativaEtapaProductiva,
          passwordHash,
          creadoPorId: user.id,
        },
      });
      creadas.push({ nombres: fila.nombres, apellidos: fila.apellidos, email: fila.email, password });
    } catch (error) {
      console.error("[api/instructor/aprendices/import] Error al guardar aprendiz:", identificador, error);
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
        role: "APRENDIZ",
      }),
    ),
  );

  return NextResponse.json({
    creadas,
    yaExistian,
    errores: [
      ...erroresParseo.map((e) => ({ motivo: `Línea ${e.linea}: ${e.motivo}` })),
      ...erroresGuardado.map((e) => ({ motivo: `${e.identificador}: ${e.motivo}` })),
    ],
  });
}
