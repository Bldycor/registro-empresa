import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { EmpresaSchema } from "@/lib/validations";
import { sincronizarPerfiles, validarEmpresa } from "@/lib/empresas";

// Edición de una empresa del catálogo (solo ADMIN). Lo que cambie aquí se copia de inmediato a
// los perfiles de todos los aprendices enlazados, para que reportes y formatos lo muestren igual.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["ADMIN", "COORDINADOR"]);
  if (!user) return response;

  const { id } = await params;
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

  const actual = await prisma.empresa.findUnique({ where: { id }, select: { id: true } });
  if (!actual) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }

  // Cambiar el NIT a uno que ya tiene otra empresa rompería «una empresa = un NIT».
  const otra = await prisma.empresa.findUnique({ where: { nit: datos.nit }, select: { id: true, nombre: true } });
  if (otra && otra.id !== id) {
    return NextResponse.json(
      { error: { nit: [`Ese NIT ya está registrado para «${otra.nombre}».`] } },
      { status: 409 },
    );
  }

  const empresa = await prisma.empresa.update({
    where: { id },
    data: { ...datos, actualizadoPorId: user.id },
    select: { id: true, nit: true, nombre: true, direccion: true, departamento: true, municipio: true },
  });

  const actualizados = await sincronizarPerfiles(id);
  return NextResponse.json({ empresa, perfilesActualizados: actualizados });
}
