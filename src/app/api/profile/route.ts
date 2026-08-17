import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es un JSON válido." },
      { status: 400 }
    );
  }

  const parsed = ProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const profile = await prisma.companyProfile.upsert({
      where: { userId: session.user.id },
      update: parsed.data,
      create: { ...parsed.data, userId: session.user.id },
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("[api/profile] Error al guardar el perfil de empresa:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al guardar la información. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
