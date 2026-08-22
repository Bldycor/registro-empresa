import { requireUser } from "@/lib/auth-guards";
import { EvidenciaEnConstruccion } from "@/components/evidencia-en-construccion";

export default async function CertificacionPage() {
  await requireUser(["APRENDIZ"]);

  return (
    <EvidenciaEnConstruccion
      titulo="Certificación del Empresario"
      descripcion="Carta de certificación a satisfacción del empresario, al cierre de tu Etapa Productiva."
    />
  );
}
