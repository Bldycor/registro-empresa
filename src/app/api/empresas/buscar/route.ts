import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { validarNit } from "@/lib/nit";

// Busca una empresa del catálogo por NIT, para que el aprendiz vea al instante si su empresa ya
// está registrada. Devuelve nombre, dirección y sus sucursales: lo que el formulario necesita.
export async function GET(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const crudo = new URL(request.url).searchParams.get("nit") ?? "";
  const nit = validarNit(crudo);
  if (!nit.ok) {
    return NextResponse.json({ valido: false, error: nit.error });
  }

  const empresa = await prisma.empresa.findUnique({
    where: { nit: nit.nit },
    select: {
      nit: true,
      nombre: true,
      direccion: true,
      departamento: true,
      municipio: true,
      // Sedes para que el aprendiz elija dónde hace la práctica (9 oct 2026).
      sucursales: {
        select: { id: true, nombre: true, direccion: true, departamento: true, municipio: true },
        orderBy: { nombre: "asc" },
      },
    },
  });

  return NextResponse.json({ valido: true, nit: nit.nit, empresa });
}
