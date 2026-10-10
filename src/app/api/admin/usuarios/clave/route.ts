import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireApiUser } from "@/lib/auth-guards";
import { prismaBase } from "@/lib/prisma-base";
import { registrarAuditoria } from "@/lib/auditoria";
import { CambioClaveAdminSchema } from "@/lib/validations";

// Cambio de contraseña de cualquier usuario de SEPA (decisión de Coordinación, 9 oct 2026):
//   - Solo el ADMIN. Ningún otro rol puede cambiar la contraseña de otra persona.
//   - Pide la contraseña del propio administrador: una sesión abierta y olvidada no basta.
//   - 5 confirmaciones erradas bloquean la cuenta del administrador 15 minutos, igual que el
//     ingreso (comparten el contador).
//   - Cambiarla también levanta un bloqueo por intentos fallidos del usuario.
//   - Queda en el rastro de auditoría quién la cambió, a quién y cuándo (nunca la contraseña).
const INTENTOS_MAXIMOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const parsed = CambioClaveAdminSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  // Lecturas y contadores con el cliente base: el rastro lo dejan los eventos explícitos de abajo.
  const admin = await prismaBase.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, intentosFallidos: true, bloqueadoHasta: true },
  });
  if (!admin) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const ahora = new Date();
  if (admin.bloqueadoHasta && admin.bloqueadoHasta > ahora) {
    return NextResponse.json(
      { error: { claveAdmin: ["Tu cuenta está bloqueada unos minutos por intentos fallidos. Espera e inténtalo de nuevo."] } },
      { status: 423 },
    );
  }

  if (!(await bcrypt.compare(d.claveAdmin, admin.passwordHash))) {
    const intentos = admin.intentosFallidos + 1;
    const bloquear = intentos >= INTENTOS_MAXIMOS;
    await prismaBase.user.update({
      where: { id: user.id },
      data: bloquear
        ? { intentosFallidos: 0, bloqueadoHasta: new Date(ahora.getTime() + BLOQUEO_MS) }
        : { intentosFallidos: intentos },
    });
    await registrarAuditoria({
      accion: bloquear ? "CUENTA_BLOQUEADA" : "CAMBIO_CLAVE_RECHAZADO",
      entidad: "Sesion",
      entidadId: user.id,
      detalle: { motivo: "Contraseña de administrador errada al cambiar una contraseña", intento: intentos },
    });
    return NextResponse.json(
      {
        error: {
          claveAdmin: [
            bloquear
              ? "Contraseña de administrador errada 5 veces: tu cuenta queda bloqueada 15 minutos."
              : `Tu contraseña de administrador no es correcta. ${INTENTOS_MAXIMOS - intentos === 1 ? "Te queda 1 intento" : `Te quedan ${INTENTOS_MAXIMOS - intentos} intentos`}.`,
          ],
        },
      },
      { status: 403 },
    );
  }

  const destino = await prismaBase.user.findUnique({
    where: { id: d.usuarioId },
    select: { id: true, nombres: true, apellidos: true, cedula: true, role: true },
  });
  if (!destino) return NextResponse.json({ error: { usuarioId: ["Ese usuario ya no existe."] } }, { status: 404 });

  await prismaBase.$transaction([
    prismaBase.user.update({
      where: { id: destino.id },
      data: { passwordHash: await bcrypt.hash(d.nuevaClave, 10), intentosFallidos: 0, bloqueadoHasta: null },
    }),
    prismaBase.user.update({ where: { id: user.id }, data: { intentosFallidos: 0 } }),
  ]);
  await registrarAuditoria({
    accion: "CLAVE_CAMBIADA_POR_ADMIN",
    entidad: "User",
    entidadId: destino.id,
    detalle: { usuario: `${destino.nombres} ${destino.apellidos}`, cedula: destino.cedula, rol: destino.role },
  });

  return NextResponse.json({
    ok: true,
    usuario: `${destino.nombres} ${destino.apellidos}`,
  });
}
