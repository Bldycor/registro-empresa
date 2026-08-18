import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ResetPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ResetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: { _root: ["Este enlace no es válido o ya expiró. Solicita uno nuevo."] } },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
