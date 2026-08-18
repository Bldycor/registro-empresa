import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { CoordinadorFichasPanel } from "@/components/coordinador-fichas-panel";

export const dynamic = "force-dynamic";

export default async function CoordinadorFichasPage() {
  await requireUser(["COORDINADOR"]);

  const [fichas, instructores] = await Promise.all([
    prisma.ficha.findMany({
      select: {
        id: true,
        codigo: true,
        instructorId: true,
        instructor: { select: { id: true, nombres: true, apellidos: true, email: true } },
        _count: { select: { aprendices: true } },
        aprendices: {
          select: { id: true, nombres: true, apellidos: true, cedula: true, estado: true },
          orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
        },
      },
      orderBy: { codigo: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: { id: true, nombres: true, apellidos: true, email: true },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
  ]);

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <CoordinadorFichasPanel initialFichas={fichas} instructores={instructores} />
    </div>
  );
}
