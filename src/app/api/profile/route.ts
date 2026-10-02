import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileSchema } from "@/lib/validations";
import { validarNit } from "@/lib/nit";

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

  // La empresa se toma del catálogo por su NIT; lo que el navegador mande como nombre o dirección
  // se ignora. Si el NIT no está registrado, no se guarda: el administrador tiene que registrar la
  // empresa primero (decisión de Coordinación, 2 oct 2026).
  const nit = validarNit(parsed.data.nitEmpresa);
  if (!nit.ok) {
    return NextResponse.json({ error: { nitEmpresa: [nit.error] } }, { status: 400 });
  }
  const empresa = await prisma.empresa.findUnique({
    where: { nit: nit.nit },
    select: { id: true, nit: true, nombre: true, direccion: true },
  });
  if (!empresa) {
    return NextResponse.json(
      {
        error: {
          nitEmpresa: [
            `La empresa con NIT ${nit.nit} todavía no está registrada en SEPA. Pídele al administrador que la registre; cuando lo haga, vuelve a guardar.`,
          ],
        },
      },
      { status: 400 },
    );
  }

  const datos = {
    nombreCoformador: parsed.data.nombreCoformador,
    cargoCoformador: parsed.data.cargoCoformador,
    correoCoformador: parsed.data.correoCoformador,
    celularCoformador: parsed.data.celularCoformador,
    empresaId: empresa.id,
    empresaPatrocinadora: empresa.nombre,
    direccionEmpresa: empresa.direccion,
    nitEmpresa: empresa.nit,
  };

  try {
    const profile = await prisma.companyProfile.upsert({
      where: { userId: session.user.id },
      update: datos,
      create: { ...datos, userId: session.user.id },
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
