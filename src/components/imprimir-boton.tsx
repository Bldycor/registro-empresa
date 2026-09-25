"use client";

// Abre el diálogo de impresión del navegador, desde donde también se guarda en PDF. La página
// oculta el menú y el encabezado al imprimir (clases `print:hidden`).
export function ImprimirBoton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro dark:bg-sena dark:text-white dark:hover:bg-sena-oscuro print:hidden"
    >
      Imprimir o guardar en PDF
    </button>
  );
}
