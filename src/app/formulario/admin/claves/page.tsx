import { requireUser } from "@/lib/auth-guards";
import { CambioClaveAdmin } from "@/components/cambio-clave-admin";

export const dynamic = "force-dynamic";

// Cambio de contraseñas de los usuarios de SEPA: exclusivo del administrador, confirmando con su
// propia contraseña (decisión de Coordinación, 9 oct 2026).
export default async function ClavesPage() {
  await requireUser(["ADMIN"]);
  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Contraseñas</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Cambia la contraseña de cualquier usuario de SEPA —aprendiz, instructor, Coordinación o administrador—
          cuando no puede recuperarla por correo. Solo el administrador puede hacerlo, y siempre confirmando con su
          propia contraseña. Cada cambio queda en Trazabilidad; la contraseña nunca se guarda ahí.
        </p>
        <CambioClaveAdmin />
      </div>
    </div>
  );
}
