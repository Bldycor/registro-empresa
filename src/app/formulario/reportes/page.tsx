import { requireUser } from "@/lib/auth-guards";
import { construirReporte, filtrosAQuery, leerFiltros } from "@/lib/reportes";
import { ReportesVista } from "@/components/reportes-vista";
import { construirInformeInstructores } from "@/lib/informe-instructores";
import { lecturaAcademica } from "@/lib/lectura-coordinaciones";
import { LecturaCoordinacionVista } from "@/components/lectura-coordinacion";

export const dynamic = "force-dynamic";

// Consultas y reportes (requisitos §3.5). Solo consulta: Coordinación y Admin ven a todos los
// aprendices, y el instructor también (no solo los de sus fichas).
export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(["INSTRUCTOR", "COORDINADOR", "ADMIN", "COORDINADOR_FORMACION"]);
  const filtros = leerFiltros(await searchParams);
  const reporte = await construirReporte(filtros);
  // Coordinación de EP (los coordinadores académicos, cada uno con su coordinación) y el
  // administrador ven al final la lectura según las funciones de la Res. 4016 de 2009. El
  // acompañamiento a instructores reutiliza el reporte cuando el único filtro es la coordinación.
  const academica = user.role === "COORDINADOR" || user.role === "ADMIN";
  const soloCoordinacion = Object.entries(filtros).every(([k, v]) => k === "coordinacion" || !v);
  const lectura = academica
    ? lecturaAcademica(
        reporte,
        await construirInformeInstructores({ coordinacion: filtros.coordinacion, ...(soloCoordinacion ? { reporte } : {}) }),
      )
    : null;
  const query = filtrosAQuery(filtros);

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 print:p-0">
      <div className="mx-auto w-full max-w-6xl">
        <ReportesVista
          reporte={reporte}
          excelHref={`/api/reportes/excel${query ? `?${query}` : ""}`}
          cierre={
            lectura && <LecturaCoordinacionVista lectura={lectura} titulo="Resumen y recomendaciones para la Coordinación Académica" />
          }
        />
      </div>
    </div>
  );
}
