import { requireUser } from "@/lib/auth-guards";
import { construirReporte, leerFiltros } from "@/lib/reportes";
import { construirInformeInstructores } from "@/lib/informe-instructores";
import { construirInformeFunciones } from "@/lib/informe-funciones";
import { lecturaFormacion } from "@/lib/lectura-coordinaciones";
import { TableroFormacion } from "@/components/tablero-formacion";
import { LecturaCoordinacionVista } from "@/components/lectura-coordinacion";

export const dynamic = "force-dynamic";

// Tablero de indicadores de la Etapa Productiva (26 oct 2026). Es la pantalla de inicio de
// Coordinación de Formación; Coordinación de Etapa Productiva y el administrador también lo ven.
// Solo consulta: los mismos cálculos de Reportes y de Gestión de instructores, resumidos.
export default async function TableroFormacionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["COORDINADOR_FORMACION", "COORDINADOR", "ADMIN"]);
  const filtros = leerFiltros(await searchParams);
  // El acompañamiento de los instructores es de todo el centro (o de la coordinación elegida). Si no
  // hay otros filtros, el reporte ya cubre a esos aprendices y se reutiliza en vez de recalcularlo.
  const soloCoordinacion = Object.entries(filtros).every(([k, v]) => k === "coordinacion" || !v);
  // Funciones en la empresa (pertinencia curricular) va en paralelo: no depende del reporte.
  const funciones = construirInformeFunciones({ programa: filtros.programa, ficha: filtros.ficha }).catch(() => null);
  const [reporte, informe] = soloCoordinacion
    ? await construirReporte(filtros).then(
        async (r) => [r, await construirInformeInstructores({ coordinacion: filtros.coordinacion, reporte: r })] as const,
      )
    : await Promise.all([construirReporte(filtros), construirInformeInstructores({ coordinacion: filtros.coordinacion })]);
  // Cierre del tablero: resumen y recomendaciones según las funciones de la Res. 4017 de 2009.
  const lectura = lecturaFormacion(reporte, informe, await funciones);

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 print:p-0">
      <div className="mx-auto w-full max-w-6xl">
        <TableroFormacion
          r={reporte}
          informe={informe}
          cierre={<LecturaCoordinacionVista lectura={lectura} titulo="Resumen y recomendaciones para la Coordinación de Formación" />}
        />
      </div>
    </div>
  );
}
