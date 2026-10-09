import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { validarSucursal } from "@/lib/empresas";

// Sucursales de una empresa co-formadora (decisión de Coordinación, 9 oct 2026): un mismo NIT puede
// tener varias sedes. Las registran el administrador y Coordinación.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN", "COORDINADOR"]);
  if (!user) return response;

  const cuerpo = (await request.json().catch(() => null)) as Record<string, string> | null;
  const empresaId = (cuerpo?.empresaId ?? "").trim();
  const empresa = empresaId ? await prisma.empresa.findUnique({ where: { id: empresaId }, select: { id: true } }) : null;
  if (!empresa) return NextResponse.json({ error: "La empresa no existe." }, { status: 404 });

  const v = validarSucursal(cuerpo ?? {});
  if (!v.ok) return NextResponse.json({ error: v.errores }, { status: 400 });

  const repetida = await prisma.sucursalEmpresa.findUnique({
    where: { empresaId_nombre: { empresaId, nombre: v.sucursal.nombre } },
    select: { id: true },
  });
  if (repetida) {
    return NextResponse.json({ error: { nombre: "Esa empresa ya tiene una sucursal con ese nombre." } }, { status: 409 });
  }

  const sucursal = await prisma.sucursalEmpresa.create({ data: { empresaId, ...v.sucursal } });
  return NextResponse.json({ sucursal }, { status: 201 });
}
