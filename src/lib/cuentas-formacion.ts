// Datos que se muestran de una cuenta de Coordinación de Formación en el panel del administrador.
export const CUENTA_FORMACION_SELECT = {
  id: true,
  nombres: true,
  apellidos: true,
  cedula: true,
  email: true,
  celular: true,
  direccionResidencia: true,
  comuna: true,
  creadoPor: { select: { nombres: true, apellidos: true } },
} as const;
