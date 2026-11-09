import { OPCIONES_COORDINACION } from "@/lib/reportes";

// Filtro por coordinación (9 nov 2026) para los formularios GET de consulta: tablero, Reportes,
// Gestión de instructores, Aprendices y Fichas. Un aprendiz pertenece a la coordinación del
// instructor de su ficha.
export function SelectorCoordinacion({
  valor,
  className,
  etiquetaClassName = "flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400",
}: {
  valor: string;
  className: string;
  etiquetaClassName?: string;
}) {
  return (
    <label className={etiquetaClassName}>
      Coordinación
      <select name="coordinacion" defaultValue={valor} className={className}>
        <option value="">Todas las coordinaciones</option>
        {OPCIONES_COORDINACION.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
