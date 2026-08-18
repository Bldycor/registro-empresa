import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Lista de instructores para el selector de asignación de fichas del coordinador.
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR"]);
  if (!user) return response;

  const instructores = await prisma.user.findMany({
    where: { role: "INSTRUCTOR" },
    select: { id: true, nombres: true, apellidos: true, email: true },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return NextResponse.json({ instructores });
}
