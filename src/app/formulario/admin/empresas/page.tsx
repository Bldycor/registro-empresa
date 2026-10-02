import { requireUser } from "@/lib/auth-guards";
import { EmpresasAdminPanel } from "@/components/empresas-admin-panel";

export const dynamic = "force-dynamic";

// Catálogo de empresas co-formadoras: solo el administrador las registra y edita.
export default async function EmpresasPage() {
  await requireUser(["ADMIN"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Empresas</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          El registro oficial de las empresas donde los aprendices hacen la práctica. Cada empresa
          se identifica por su NIT, con la razón social del RUES y su ubicación según el DANE. El
          aprendiz elige la suya por el NIT y no puede cambiar estos datos; si su empresa no está
          aquí, no puede completar su perfil hasta que la registres.
        </p>
        <EmpresasAdminPanel />
      </div>
    </div>
  );
}
