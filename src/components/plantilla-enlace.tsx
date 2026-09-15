// Plantillas oficiales descargables (requisitos §3.3). El aprendiz puede diligenciarlas fuera del
// sistema y subirlas como adjunto. Los archivos viven en public/documentos.
export const PLANTILLA_BITACORA = {
  href: "/documentos/GFPI-F-147_V05_Bitacora_Seguimiento_EP.xlsx",
  etiqueta: "formato GFPI-F-147 (bitácora, Excel)",
};

export const PLANTILLA_EVALUACION = {
  href: "/documentos/GFPI-F-023_V06_Planeacion_Seguimiento_Evaluacion_EP.docx",
  etiqueta: "formato GFPI-F-023 (planeación, seguimiento y evaluación, Word)",
};

export function PlantillaEnlace({ plantilla }: { plantilla: { href: string; etiqueta: string } }) {
  return (
    <a
      href={plantilla.href}
      download
      className="inline-flex w-fit items-center gap-1 text-sm font-medium text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-500 dark:hover:text-emerald-400"
    >
      Descargar el {plantilla.etiqueta}
    </a>
  );
}
