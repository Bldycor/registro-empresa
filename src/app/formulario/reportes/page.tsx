import { requireUser } from "@/lib/auth-guards";
import { construirReporte, filtrosAQuery, leerFiltros } from "@/lib/reportes";
import { ReportesVista } from "@/components/reportes-vista";

export const dynamic = "force-dynamic";

// Consultas y reportes (requisitos §3.5). Solo consulta: Coordinación y Admin ven a todos los
// aprendices, y el instructor también (no solo los de sus fichas).
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["INSTRUCTOR", "COORDINADOR", "ADMIN"]);
  const filtros = leerFiltros(await searchParams);
  const reporte = await construirReporte(filtros);
  const query = filtrosAQuery(filtros);

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 print:p-0">
      <div className="mx-auto w-full max-w-6xl">
        <ReportesVista reporte={reporte} excelHref={`/api/reportes/excel${query ? `?${query}` : ""}`} />
      </div>
    </div>
  );
}
