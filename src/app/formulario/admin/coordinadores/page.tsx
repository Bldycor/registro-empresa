import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { AdminCoordinadoresPanel } from "@/components/admin-coordinadores-panel";

export const dynamic = "force-dynamic";

export default async function AdminCoordinadoresPage() {
  await requireUser(["ADMIN"]);

  const coordinadores = await prisma.user.findMany({
    where: { role: "COORDINADOR" },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      email: true,
      celular: true,
      direccionResidencia: true,
      comuna: true,
      coordinacion: true,
      creadoPorId: true,
      creadoPor: { select: { id: true, nombres: true, apellidos: true } },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <AdminCoordinadoresPanel initialCoordinadores={coordinadores} />
    </div>
  );
}
