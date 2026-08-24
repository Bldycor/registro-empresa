import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { CoordinadorInstructoresPanel } from "@/components/coordinador-instructores-panel";

export const dynamic = "force-dynamic";

export default async function CoordinadorInstructoresPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  const instructores = await prisma.user.findMany({
    where: { role: "INSTRUCTOR" },
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
      fichasAsignadas: {
        select: { id: true, codigo: true, _count: { select: { aprendices: true } } },
      },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <CoordinadorInstructoresPanel initialInstructores={instructores} />
    </div>
  );
}
