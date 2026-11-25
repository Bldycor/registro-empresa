import { requireUser } from "@/lib/auth-guards";
import { sesionesDelInstructor } from "@/lib/sesiones-grupales";
import { SesionesGrupalesPanel } from "@/components/sesiones-grupales-panel";

export const dynamic = "force-dynamic";

// Sesiones grupales de los momentos (25 nov 2026): el instructor convoca a varios aprendices de
// sus fichas a una sola reunión; cada uno conserva su evidencia individual.
export default async function SesionesGrupalesPage() {
  const user = await requireUser(["INSTRUCTOR"]);
  const sesiones = await sesionesDelInstructor(user.id);
  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sesiones grupales</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Convoca a varios aprendices de tus fichas a una sola reunión de un momento, presencial o virtual. Cada
          aprendiz conserva su evidencia: envía su formato GFPI-F-023 y tú lo valoras por separado, como siempre.
        </p>
        <SesionesGrupalesPanel sesiones={sesiones} />
      </div>
    </div>
  );
}
