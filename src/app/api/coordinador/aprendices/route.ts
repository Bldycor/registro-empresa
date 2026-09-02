import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Lista de todos los aprendices (con ficha o sin asignar) para el panel de gestión del
// Coordinador (o el ADMIN, que tiene control total). A diferencia de la vista del Instructor
// (solo lectura, filtrada por ficha), esta cubre a todos los aprendices del sistema.
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const aprendices = await prisma.user.findMany({
    where: { role: "APRENDIZ" },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      email: true,
      celular: true,
      direccionResidencia: true,
      comuna: true,
      estado: true,
      alternativaEtapaProductiva: true,
      fichaId: true,
      ficha: {
        select: {
          id: true,
          codigo: true,
          instructor: { select: { nombres: true, apellidos: true } },
        },
      },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return NextResponse.json({ aprendices });
}
