import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ForgotPasswordSchema } from "@/lib/validations";
import { sendPasswordResetEmail } from "@/lib/mailer";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ForgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { cedula } = parsed.data;

  // Respuesta genérica siempre, exista o no la cédula: evita que este formulario se use para
  // averiguar qué cédulas están registradas en el sistema.
  const genericResponse = NextResponse.json({
    success: true,
    message:
      "Si la cédula está registrada, enviamos un enlace de recuperación al correo asociado a esa cuenta.",
  });

  const user = await prisma.user.findUnique({ where: { cedula } });
  if (!user) {
    return genericResponse;
  }

  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // Invalidamos enlaces anteriores sin usar antes de crear uno nuevo, para que solo el más
    // reciente quede activo.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const resetUrl = process.env.APP_URL
      ? `${process.env.APP_URL.replace(/\/$/, "")}/reset-password?token=${token}`
      : `/reset-password?token=${token}`;

    await sendPasswordResetEmail({ nombres: user.nombres, email: user.email, resetUrl });
  } catch (error) {
    console.error(
      "[api/auth/forgot-password] No se pudo generar/enviar el enlace de recuperación:",
      error
    );
  }

  return genericResponse;
}
