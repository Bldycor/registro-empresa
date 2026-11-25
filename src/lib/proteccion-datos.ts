// Protección de datos personales (Ley 1581 de 2012), resumida para SEPA (25 nov 2026). Todo sale
// de la política del SENA: Acuerdo 13 de 2019 (Política General de Seguridad de la Información y
// Protección de Datos Personales; sección 16 de su Manual) y Acuerdo 9 de 2016, que sigue vigente
// mientras se implementa la política complementaria (art. 15 y 17 del Acuerdo 13). No agregar
// nada que no esté en esos textos.

export const POLITICA_DATOS = [
  { nombre: "Acuerdo 13 de 2019", url: "https://normograma.sena.edu.co/compilacion/docs/acuerdo_sena_0013_2019.htm" },
  { nombre: "Acuerdo 9 de 2016", url: "https://normograma.sena.edu.co/compilacion/docs/acuerdo_sena_0009_2016.htm" },
] as const;

// Acuerdo 13 de 2019, Manual, sección 16.8.
export const DERECHOS_TITULAR = [
  "Conocer, actualizar y rectificar tus datos.",
  "Pedir prueba de la autorización que diste.",
  "Saber qué uso se le da a tus datos.",
  "Revocar la autorización o pedir que se supriman tus datos, en los casos de ley.",
  "Quejarte ante la Superintendencia de Industria y Comercio.",
  "Acceder gratis a tus datos.",
] as const;

// Sección 16.13: los mismos canales de peticiones, quejas, reclamos y sugerencias del SENA;
// consultas en 10 días hábiles (16.13.1) y reclamos en 15 (16.12).
export const CANAL_DERECHOS =
  "Por los canales de peticiones, quejas, reclamos y sugerencias (PQRS) del SENA: las consultas se responden en 10 días hábiles y los reclamos en 15.";
