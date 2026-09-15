"use client";

// Abre el diálogo de impresión del navegador, desde donde también se guarda en PDF. La página
// oculta el menú y el encabezado al imprimir (clases `print:hidden`).
export function ImprimirBoton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 print:hidden"
    >
      Imprimir o guardar en PDF
    </button>
  );
}
