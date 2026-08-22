import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConcertacionForm } from "@/components/concertacion-form";

export const dynamic = "force-dynamic";

export default async function EtapaProductivaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, concertacion] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.concertacionFuncion.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!profile) {
    redirect("/formulario");
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Momento 1 — Planeación de la Etapa Productiva
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Concertación de funciones con tu coformador (formato GFPI-F-023). Los Momentos 2
          (seguimiento) y 3 (evaluación final) estarán disponibles aquí más adelante.
        </p>
      </div>

      <ConcertacionForm
        initialData={
          concertacion
            ? {
                fecha: concertacion.fecha.toISOString().slice(0, 10),
                horaInicio: concertacion.horaInicio,
                horaFin: concertacion.horaFin,
              }
            : null
        }
        videollamadaUrl={concertacion?.videollamadaUrl ?? null}
      />
    </div>
  );
}
