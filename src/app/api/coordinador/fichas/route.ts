import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Gestión de fichas por el coordinador académico: listar (con su instructor asignado y cantidad
// de aprendices) y carga masiva por texto. El coordinador precarga las fichas activas antes de
// que los aprendices se registren (ver src/app/api/fichas/route.ts, el selector público).
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const fichas = await prisma.ficha.findMany({
    select: {
      id: true,
      codigo: true,
      programa: true,
      estado: true,
      nivelFormacion: true,
      jornada: true,
      fechaInicioFicha: true,
      fechaInicioProductiva: true,
      fechaFinFormacion: true,
      fechaLimiteIniciarEP: true,
      instructorId: true,
      instructor: { select: { id: true, nombres: true, apellidos: true, email: true } },
      _count: { select: { aprendices: true } },
      aprendices: {
        select: { id: true, nombres: true, apellidos: true, cedula: true, estado: true },
        orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
      },
    },
    orderBy: { codigo: "asc" },
  });

  return NextResponse.json({ fichas });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const raw = typeof body?.codigos === "string" ? body.codigos : "";

  // Acepta una ficha por línea, o separadas por coma; ignora líneas vacías y espacios sobrantes.
  const codigos = Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((c: string) => c.trim())
        .filter((c: string) => c.length > 0)
    )
  ) as string[];

  if (codigos.length === 0) {
    return NextResponse.json(
      { error: "Pega al menos un código de ficha (uno por línea, o separados por coma)." },
      { status: 400 }
    );
  }

  const existentes = await prisma.ficha.findMany({
    where: { codigo: { in: codigos } },
    select: { codigo: true },
  });
  const yaExisten = new Set(existentes.map((f) => f.codigo));
  const nuevos = codigos.filter((c) => !yaExisten.has(c));

  if (nuevos.length > 0) {
    await prisma.ficha.createMany({
      data: nuevos.map((codigo) => ({ codigo })),
    });
  }

  return NextResponse.json({
    creadas: nuevos,
    yaExistian: codigos.filter((c) => yaExisten.has(c)),
  });
}
