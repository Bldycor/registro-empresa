import { requireUser } from "@/lib/auth-guards";
import { EmpresasAdminPanel } from "@/components/empresas-admin-panel";

export const dynamic = "force-dynamic";

// Catálogo de empresas co-formadoras y sus sedes: lo administran el administrador y Coordinación.
export default async function EmpresasPage() {
  // El catálogo lo administran el administrador y Coordinación (decisión del 9 oct 2026).
  await requireUser(["ADMIN", "COORDINADOR"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Empresas</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          El registro oficial de las empresas donde los aprendices hacen la práctica. Cada empresa
          se identifica por su NIT, con la razón social del RUES y su ubicación según el DANE. El
          aprendiz elige la suya por el NIT y no puede cambiar estos datos; si su empresa no está
          aquí, no puede completar su perfil hasta que la registres. Si la empresa tiene varias sedes
          con el mismo NIT, agrégalas en «Sedes»: cada aprendiz elige la suya.
        </p>
        <EmpresasAdminPanel />
      </div>
    </div>
  );
}
