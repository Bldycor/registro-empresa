import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { ConfiguracionCentroSchema } from "@/lib/validations";

// Parámetros del centro para el formato GFPI-F-023. Los lee cualquier rol autenticado —el formato
// del aprendiz los necesita— pero solo Coordinación y Admin los cambian.
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const configuracion = await prisma.configuracionCentro.findUnique({ where: { id: "centro" } });
  return NextResponse.json({ configuracion });
}

export async function PUT(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const parsed = ConfiguracionCentroSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Lo que quede vacío se guarda vacío: el formato lo mostrará en blanco, nunca inventado.
  const limpiar = (v: string | null | undefined) => (v ?? "").trim() || null;
  const valores = {
    regional: limpiar(parsed.data.regional),
    centroFormacion: limpiar(parsed.data.centroFormacion),
    estrategiaFormativa: limpiar(parsed.data.estrategiaFormativa),
    actualizadoPorId: user.id,
  };

  const configuracion = await prisma.configuracionCentro.upsert({
    where: { id: "centro" },
    create: { id: "centro", ...valores },
    update: valores,
  });

  return NextResponse.json({ configuracion });
}
