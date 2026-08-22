import { redirect } from "next/navigation";

// La ruta base ya no tiene contenido propio: las 5 evidencias viven en sus propias subrutas
// (alternativa, formalizacion, bitacoras, evaluaciones, certificacion), navegables desde el nav
// horizontal `EvidenciaEPNav`. El punto de entrada natural es la selección de alternativa.
export default function EtapaProductivaIndexPage() {
  redirect("/formulario/etapa-productiva/alternativa");
}
