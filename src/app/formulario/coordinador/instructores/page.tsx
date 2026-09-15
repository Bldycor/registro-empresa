import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { CoordinadorInstructoresPanel } from "@/components/coordinador-instructores-panel";
import { aprendicesActivosPorInstructor } from "@/lib/carga-instructor";

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
        select: {
          id: true,
          codigo: true,
          programa: true,
          _count: { select: { aprendices: true } },
          aprendices: {
            select: { id: true, nombres: true, apellidos: true },
            orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
          },
        },
      },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  // Carga frente al tope de 80 aprendices activos por instructor (§9.1.3), igual que en la API.
  const activos = await aprendicesActivosPorInstructor(instructores.map((i) => i.id));
  const conCarga = instructores.map((i) => ({ ...i, aprendicesActivos: activos.get(i.id) ?? 0 }));

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <CoordinadorInstructoresPanel initialInstructores={conCarga} />
    </div>
  );
}
