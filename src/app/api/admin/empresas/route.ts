import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { EmpresaSchema } from "@/lib/validations";
import { empresasPendientes, validarEmpresa } from "@/lib/empresas";

// Catálogo de empresas co-formadoras. Solo el ADMIN lo ve y lo administra (decisión de
// Coordinación, 2 oct 2026).
export async function GET() {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const [empresas, pendientes] = await Promise.all([
    prisma.empresa.findMany({
      select: {
        id: true,
        nit: true,
        nombre: true,
        direccion: true,
        departamento: true,
        municipio: true,
        updatedAt: true,
        _count: { select: { perfiles: true } },
      },
      orderBy: { nombre: "asc" },
    }),
    empresasPendientes(),
  ]);

  return NextResponse.json({
    empresas: empresas.map((e) => ({ ...e, aprendices: e._count.perfiles })),
    pendientes,
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const parsed = EmpresaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const validada = validarEmpresa(parsed.data);
  if (!validada.ok) {
    return NextResponse.json(
      { error: Object.fromEntries(Object.entries(validada.errores).map(([k, v]) => [k, [v]])) },
      { status: 400 },
    );
  }
  const datos = validada.empresa;

  // Una empresa = un NIT.
  const existente = await prisma.empresa.findUnique({ where: { nit: datos.nit }, select: { nombre: true } });
  if (existente) {
    return NextResponse.json(
      { error: { nit: [`Ese NIT ya está registrado para «${existente.nombre}».`] } },
      { status: 409 },
    );
  }

  const empresa = await prisma.empresa.create({
    data: { ...datos, creadoPorId: user.id, actualizadoPorId: user.id },
    select: { id: true, nit: true, nombre: true, direccion: true, departamento: true, municipio: true },
  });

  return NextResponse.json({ empresa }, { status: 201 });
}
