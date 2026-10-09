import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { validarSucursal } from "@/lib/empresas";

// Editar o quitar una sucursal. Al editarla, la dirección que ven sus aprendices (en el formato,
// los reportes y el expediente) se actualiza también.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["ADMIN", "COORDINADOR"]);
  if (!user) return response;
  const { id } = await params;

  const actual = await prisma.sucursalEmpresa.findUnique({ where: { id }, select: { id: true, empresaId: true } });
  if (!actual) return NextResponse.json({ error: "La sucursal no existe." }, { status: 404 });

  const v = validarSucursal((await request.json().catch(() => null)) ?? {});
  if (!v.ok) return NextResponse.json({ error: v.errores }, { status: 400 });

  const repetida = await prisma.sucursalEmpresa.findUnique({
    where: { empresaId_nombre: { empresaId: actual.empresaId, nombre: v.sucursal.nombre } },
    select: { id: true },
  });
  if (repetida && repetida.id !== id) {
    return NextResponse.json({ error: { nombre: "Esa empresa ya tiene una sucursal con ese nombre." } }, { status: 409 });
  }

  const sucursal = await prisma.sucursalEmpresa.update({ where: { id }, data: v.sucursal });
  await prisma.companyProfile.updateMany({ where: { sucursalId: id }, data: { direccionEmpresa: sucursal.direccion } });
  return NextResponse.json({ sucursal });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["ADMIN", "COORDINADOR"]);
  if (!user) return response;
  const { id } = await params;

  const sucursal = await prisma.sucursalEmpresa.findUnique({
    where: { id },
    select: { id: true, _count: { select: { perfiles: true } } },
  });
  if (!sucursal) return NextResponse.json({ error: "La sucursal no existe." }, { status: 404 });
  // Con aprendices no se borra: quedarían con la dirección de una sede que ya no existe.
  if (sucursal._count.perfiles > 0) {
    return NextResponse.json(
      {
        error: `Hay ${sucursal._count.perfiles} aprendiz(es) en esta sucursal. Cada uno debe elegir otra sede en «Mi perfil» antes de quitarla.`,
      },
      { status: 409 },
    );
  }
  await prisma.sucursalEmpresa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
