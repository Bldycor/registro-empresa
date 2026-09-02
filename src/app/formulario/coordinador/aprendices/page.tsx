import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { CoordinadorAprendicesPanel } from "@/components/coordinador-aprendices-panel";

export const dynamic = "force-dynamic";

export default async function CoordinadorAprendicesPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  const [aprendices, fichas] = await Promise.all([
    prisma.user.findMany({
      where: { role: "APRENDIZ" },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        cedula: true,
        email: true,
        celular: true,
        direccionResidencia: true,
        comuna: true,
        estado: true,
        alternativaEtapaProductiva: true,
        fichaId: true,
        ficha: {
          select: {
            id: true,
            codigo: true,
            instructor: { select: { nombres: true, apellidos: true } },
          },
        },
      },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
    prisma.ficha.findMany({
      select: { id: true, codigo: true },
      orderBy: { codigo: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <CoordinadorAprendicesPanel initialAprendices={aprendices} fichas={fichas} />
    </div>
  );
}
