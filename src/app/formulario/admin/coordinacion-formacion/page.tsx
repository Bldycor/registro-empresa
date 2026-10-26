import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { CUENTA_FORMACION_SELECT } from "@/lib/cuentas-formacion";
import { AdminCoordinacionFormacionPanel } from "@/components/admin-coordinacion-formacion-panel";

export const dynamic = "force-dynamic";

// Cuentas de Coordinación de Formación: solo las crea y corrige el administrador.
export default async function AdminCoordinacionFormacionPage() {
  await requireUser(["ADMIN"]);

  const cuentas = await prisma.user.findMany({
    where: { role: "COORDINADOR_FORMACION" },
    select: CUENTA_FORMACION_SELECT,
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <AdminCoordinacionFormacionPanel iniciales={cuentas} />
    </div>
  );
}
