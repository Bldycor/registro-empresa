// Pasos del proceso de arranque de la Etapa Productiva (lo construido hasta ahora en Fase 0).
// A medida que se agreguen bitácoras, evaluaciones 2/3 y certificación (fases siguientes),
// se suman nuevos pasos aquí y el menú de navegación los recoge automáticamente.

export type StepStatus = "completo" | "pendiente" | "bloqueado";

export type ProcesoStep = {
  key: string;
  href: string;
  label: string;
  description: string;
  status: StepStatus;
};

export function buildFase0Steps({
  profileCompleto,
  concertacionCompleta,
}: {
  profileCompleto: boolean;
  concertacionCompleta: boolean;
}): ProcesoStep[] {
  return [
    {
      key: "perfil",
      // Mientras no exista el perfil, el proceso vive en /formulario; una vez creado,
      // la edición pasa a vivir en /formulario/actualizar.
      href: profileCompleto ? "/formulario/actualizar" : "/formulario",
      label: "Datos personales y de la empresa",
      description: "Tu información y la de la empresa donde harás tu Etapa Productiva.",
      status: profileCompleto ? "completo" : "pendiente",
    },
    {
      key: "concertacion",
      href: "/formulario/etapa-productiva",
      label: "Concertación de funciones",
      description: "Primera evaluación: agenda la reunión con tu coformador.",
      status: !profileCompleto ? "bloqueado" : concertacionCompleta ? "completo" : "pendiente",
    },
  ];
}
