import { requireUser } from "@/lib/auth-guards";
import { EvidenciaEnConstruccion } from "@/components/evidencia-en-construccion";

export default async function BitacorasPage() {
  await requireUser(["APRENDIZ"]);

  return (
    <EvidenciaEnConstruccion
      titulo="Bitácoras"
      descripcion="Registro quincenal de actividades durante tu Etapa Productiva (formato GFPI-F-147)."
    />
  );
}
