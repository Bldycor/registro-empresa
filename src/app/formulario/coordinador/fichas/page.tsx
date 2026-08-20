import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { CoordinadorFichasPanel } from "@/components/coordinador-fichas-panel";

export const dynamic = "force-dynamic";

export default async function CoordinadorFichasPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  const [fichas, instructores] = await Promise.all([
    prisma.ficha.findMany({
      select: {
        id: true,
        codigo: true,
        estado: true,
        nivelFormacion: true,
        jornada: true,
        fechaInicioFicha: true,
        fechaInicioProductiva: true,
        fechaFinFormacion: true,
        fechaLimiteIniciarEP: true,
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

  // Las fechas de Prisma llegan como Date en este server component (React Server Components las
  // conserva tal cual entre server y client, a diferencia de una respuesta JSON de API que las
  // convierte a string) — se serializan aquí para que el componente cliente siempre reciba el
  // mismo tipo (string), sea en la carga inicial o en un refetch posterior a /api.
  const fichasSerializadas = fichas.map((ficha) => ({
    ...ficha,
    fechaInicioFicha: ficha.fechaInicioFicha?.toISOString() ?? null,
    fechaInicioProductiva: ficha.fechaInicioProductiva?.toISOString() ?? null,
    fechaFinFormacion: ficha.fechaFinFormacion?.toISOString() ?? null,
    fechaLimiteIniciarEP: ficha.fechaLimiteIniciarEP?.toISOString() ?? null,
  }));

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <CoordinadorFichasPanel initialFichas={fichasSerializadas} instructores={instructores} />
    </div>
  );
}
