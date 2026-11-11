import Link from "next/link";
import { etiquetaCoordinacion, filtrosAQuery, type FiltrosReporte, type Reporte } from "@/lib/reportes";
import { estadoAprendizLabel } from "@/lib/validations";

// Los filtros aplicados, como etiquetas con ✕ para quitar cada uno sin rehacer los demás
// (10 nov 2026). Sirve en Reportes y en el tablero, que comparten `FiltrosReporte`.
export function FiltrosActivos({ r, ruta }: { r: Reporte; ruta: string }) {
  const f = r.filtros;
  const etiquetas: [keyof FiltrosReporte, string][] = (
    [
      ["programa", f.programa && `Programa: ${f.programa}`],
      ["coordinacion", f.coordinacion && `Coordinación: ${etiquetaCoordinacion(f.coordinacion)}`],
      ["ficha", f.ficha && `Ficha ${f.ficha}`],
      ["instructor", f.instructor && `Instructor: ${r.opciones.instructores.find((i) => i.id === f.instructor)?.nombre ?? "—"}`],
      ["empresa", f.empresa && `Empresa: ${f.empresa}`],
      ["estado", f.estado && `Estado: ${estadoAprendizLabel[f.estado as keyof typeof estadoAprendizLabel] ?? f.estado}`],
      ["desde", f.desde && `Inicio de EP desde ${f.desde}`],
      ["hasta", f.hasta && `Inicio de EP hasta ${f.hasta}`],
    ] as [keyof FiltrosReporte, string | false][]
  ).filter((e): e is [keyof FiltrosReporte, string] => Boolean(e[1]));
  if (etiquetas.length === 0) return null;

  const sin = (clave: keyof FiltrosReporte) => {
    const q = filtrosAQuery({ ...f, [clave]: "" });
    return q ? `${ruta}?${q}` : ruta;
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm print:hidden" aria-label="Filtros aplicados">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">Viendo:</span>
      {etiquetas.map(([clave, texto]) => (
        <Link
          key={clave}
          href={sin(clave)}
          title="Quitar este filtro"
          className="inline-flex items-center gap-1 rounded-full border border-azul/30 bg-white px-3 py-0.5 text-zinc-800 hover:border-red-400 hover:text-red-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {texto} <span aria-hidden>✕</span>
          <span className="sr-only">(quitar)</span>
        </Link>
      ))}
      <Link href={ruta} className="text-xs text-zinc-600 underline dark:text-zinc-400">
        Quitar todos
      </Link>
    </div>
  );
}
