import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint público (sin autenticación): alimenta el selector de ficha del formulario de
// registro, que se usa antes de que el aprendiz tenga sesión. Solo expone id + código, nada
// sensible (ni instructor asignado ni datos de otros usuarios).
export async function GET() {
  const fichas = await prisma.ficha.findMany({
    select: { id: true, codigo: true },
    orderBy: { codigo: "asc" },
  });

  return NextResponse.json({ fichas });
}
