const tonoBadge: Record<"verde" | "ambar" | "rojo" | "azul", string> = {
  verde: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ambar: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  rojo: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  azul: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function StatBadge({
  tono,
  etiqueta,
  cantidad,
}: {
  tono: "verde" | "ambar" | "rojo" | "azul";
  etiqueta: string;
  cantidad: number;
}) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tonoBadge[tono]}`}>
      {cantidad} {etiqueta}
    </span>
  );
}
