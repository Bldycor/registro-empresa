import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { EnlazarEmpresaSchema } from "@/lib/validations";
import { nombreNormalizado, sincronizarPerfiles } from "@/lib/empresas";

// Enlaza al catálogo los perfiles que los aprendices escribieron a mano antes de que existiera
// (solo ADMIN). Se agrupan por el nombre que escribieron —sin mayúsculas, tildes ni espacios de
// más—, así el administrador registra cada empresa una vez y todos sus aprendices quedan
// enlazados, sin tener que pedirle el NIT a cada uno.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const parsed = EnlazarEmpresaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: parsed.data.empresaId },
    select: { id: true },
  });
  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }

  const buscado = nombreNormalizado(parsed.data.nombreEscrito);
  const candidatos = await prisma.companyProfile.findMany({
    where: { empresaId: null },
    select: { id: true, empresaPatrocinadora: true },
  });
  const ids = candidatos.filter((p) => nombreNormalizado(p.empresaPatrocinadora) === buscado).map((p) => p.id);

  if (ids.length === 0) {
    return NextResponse.json({ enlazados: 0 });
  }

  await prisma.companyProfile.updateMany({
    where: { id: { in: ids } },
    data: { empresaId: empresa.id },
  });
  await sincronizarPerfiles(empresa.id);

  return NextResponse.json({ enlazados: ids.length });
}
