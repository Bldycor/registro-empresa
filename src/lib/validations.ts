import { z } from "zod";
import { toMinutes } from "@/lib/time";

// Las 16 comunas oficiales de Medellín (enum `Comuna` de prisma/schema.prisma), con su nombre
// legible para los desplegables. Reemplaza el antiguo campo de "barrio" en texto libre.
export const ComunaValues = [
  "POPULAR",
  "SANTA_CRUZ",
  "MANRIQUE",
  "ARANJUEZ",
  "CASTILLA",
  "DOCE_DE_OCTUBRE",
  "ROBLEDO",
  "VILLA_HERMOSA",
  "BUENOS_AIRES",
  "LA_CANDELARIA",
  "LAURELES_ESTADIO",
  "LA_AMERICA",
  "SAN_JAVIER",
  "EL_POBLADO",
  "GUAYABAL",
  "BELEN",
] as const;
export type ComunaValue = (typeof ComunaValues)[number];

export const comunaLabel: Record<ComunaValue, string> = {
  POPULAR: "Popular",
  SANTA_CRUZ: "Santa Cruz",
  MANRIQUE: "Manrique",
  ARANJUEZ: "Aranjuez",
  CASTILLA: "Castilla",
  DOCE_DE_OCTUBRE: "Doce de Octubre",
  ROBLEDO: "Robledo",
  VILLA_HERMOSA: "Villa Hermosa",
  BUENOS_AIRES: "Buenos Aires",
  LA_CANDELARIA: "La Candelaria",
  LAURELES_ESTADIO: "Laureles-Estadio",
  LA_AMERICA: "La América",
  SAN_JAVIER: "San Javier",
  EL_POBLADO: "El Poblado",
  GUAYABAL: "Guayabal",
  BELEN: "Belén",
};

// Áreas/departamentos del SENA (enum `Coordinacion`). Aplica a Instructor y Coordinador.
export const CoordinacionValues = [
  "CONTABILIDAD_FINANZAS",
  "COMERCIO_VENTAS",
  "GESTION_ADMINISTRATIVA_DOCUMENTAL",
] as const;
export type CoordinacionValue = (typeof CoordinacionValues)[number];

export const coordinacionLabel: Record<CoordinacionValue, string> = {
  CONTABILIDAD_FINANZAS: "Contabilidad y Finanzas",
  COMERCIO_VENTAS: "Comercio y Ventas",
  GESTION_ADMINISTRATIVA_DOCUMENTAL: "Gestión Administrativa y Documental",
};

// Estado institucional de la ficha (enum `EstadoFicha`). TERMINADA y TERMINADA_POR_FECHA son
// hitos distintos: TERMINADA = venció el plazo límite para iniciar Etapa Productiva sin haberla
// iniciado; TERMINADA_POR_FECHA = ya se cumplió la fecha de fin de formación.
export const EstadoFichaValues = ["EN_EJECUCION", "TERMINADA", "TERMINADA_POR_FECHA"] as const;
export type EstadoFichaValue = (typeof EstadoFichaValues)[number];

export const estadoFichaLabel: Record<EstadoFichaValue, string> = {
  EN_EJECUCION: "En ejecución",
  TERMINADA: "Terminada (venció límite para iniciar EP)",
  TERMINADA_POR_FECHA: "Terminada por fecha (fin de formación)",
};

export const NivelFormacionValues = ["TECNICO", "TECNOLOGO", "AUXILIAR"] as const;
export type NivelFormacionValue = (typeof NivelFormacionValues)[number];

export const nivelFormacionLabel: Record<NivelFormacionValue, string> = {
  TECNICO: "Técnico",
  TECNOLOGO: "Tecnólogo",
  AUXILIAR: "Auxiliar",
};

export const JornadaValues = ["MANANA", "TARDE", "NOCHE", "MIXTA", "VIRTUAL", "TARDE_NOCHE"] as const;
export type JornadaValue = (typeof JornadaValues)[number];

export const jornadaLabel: Record<JornadaValue, string> = {
  MANANA: "Mañana",
  TARDE: "Tarde",
  NOCHE: "Noche",
  MIXTA: "Mixta",
  VIRTUAL: "Virtual",
  TARDE_NOCHE: "Tarde-Noche",
};

// Edición de los datos de gestión de una ficha ya creada (coordinador). Todos opcionales: una
// ficha puede tener solo algunos campos diligenciados.
// fechaInicioProductiva y fechaLimiteIniciarEP NO están acá a propósito: se calculan siempre en
// el servidor con la fórmula oficial (ver src/lib/ficha-fechas.ts), no se editan directamente.
export const FichaGestionSchema = z.object({
  estado: z.enum(EstadoFichaValues).nullable().optional(),
  nivelFormacion: z.enum(NivelFormacionValues).nullable().optional(),
  jornada: z.enum(JornadaValues).nullable().optional(),
  fechaInicioFicha: z.string().trim().nullable().optional(),
  fechaFinFormacion: z.string().trim().nullable().optional(),
});

export type FichaGestionInput = z.infer<typeof FichaGestionSchema>;

// Modalidad ("alternativa") de Etapa Productiva bajo la que el aprendiz la cursa (enum
// `AlternativaEtapaProductiva`). Se elige al registrarse; el coordinador/admin puede corregirla.
export const AlternativaEtapaProductivaValues = [
  "CONTRATO_APRENDIZAJE",
  "CONTRATO_VINCULO_FORMATIVO",
  "MONITORIA",
  "PROYECTO_PRODUCTIVO",
  "VINCULO_LABORAL",
] as const;
export type AlternativaEtapaProductivaValue = (typeof AlternativaEtapaProductivaValues)[number];

export const alternativaEtapaProductivaLabel: Record<AlternativaEtapaProductivaValue, string> = {
  CONTRATO_APRENDIZAJE: "Contrato de aprendizaje",
  CONTRATO_VINCULO_FORMATIVO: "Contrato vínculo formativo",
  MONITORIA: "Monitoría",
  PROYECTO_PRODUCTIVO: "Proyecto productivo",
  VINCULO_LABORAL: "Vínculo laboral",
};

// Estado del aprendiz durante/después de la Etapa Productiva (enum `EstadoAprendiz`). El paso a
// CERTIFICADO es manual — la certificación de estudio se emite fuera del sistema.
export const EstadoAprendizValues = ["ACTIVO", "CERTIFICADO"] as const;
export type EstadoAprendizValue = (typeof EstadoAprendizValues)[number];

export const estadoAprendizLabel: Record<EstadoAprendizValue, string> = {
  ACTIVO: "Activo",
  CERTIFICADO: "Certificado",
};

// Edición de los datos de un aprendiz por el Coordinador (o el ADMIN): datos personales, estado
// y asignación de ficha — incluye poder desasignarlo (fichaId a null) para un aprendiz que quede
// sin ficha, o reasignarlo a otra. Todo opcional: se envía solo lo que cambia.
export const AprendizGestionSchema = z.object({
  nombres: z.string().trim().min(2, "Ingresa los nombres.").optional(),
  apellidos: z.string().trim().min(2, "Ingresa los apellidos.").optional(),
  cedula: z.string().trim().min(5, "Ingresa un número de cédula válido.").optional(),
  email: z.string().trim().email("Ingresa un correo válido.").optional(),
  celular: z.string().trim().min(7, "Ingresa un número de celular válido.").optional(),
  direccionResidencia: z.string().trim().min(5, "Ingresa la dirección de residencia.").optional(),
  comuna: z.enum(ComunaValues).nullable().optional(),
  estado: z.enum(EstadoAprendizValues).optional(),
  alternativaEtapaProductiva: z.enum(AlternativaEtapaProductivaValues).nullable().optional(),
  fichaId: z.string().trim().nullable().optional(),
});

export type AprendizGestionInput = z.infer<typeof AprendizGestionSchema>;

// Datos personales compartidos por los tres formularios de registro/creación de cuenta
// (Aprendiz en /register, Coordinador en /register-coordinador, Instructor creado por el
// Coordinador desde su panel). Cada flujo extiende esta base con lo que le aplica.
const datosPersonalesBase = {
  nombres: z.string().trim().min(2, "Ingresa tus nombres."),
  apellidos: z.string().trim().min(2, "Ingresa tus apellidos."),
  cedula: z.string().trim().min(5, "Ingresa un número de cédula válido."),
  email: z.string().trim().email("Ingresa un correo válido."),
  celular: z.string().trim().min(7, "Ingresa un número de celular válido."),
  direccionResidencia: z.string().trim().min(5, "Ingresa tu dirección de residencia."),
  comuna: z.enum(ComunaValues, { message: "Selecciona tu comuna." }),
};

// Registro público de Aprendiz (/register). El rol queda fijo en el route handler, no viaja
// en el body — ya no hay selector de "tipo de usuario" compartido con Instructor/Coordinador.
export const RegisterAprendizSchema = z.object({
  ...datosPersonalesBase,
  fichaId: z.string().trim().min(1, "Selecciona tu ficha."),
  alternativaEtapaProductiva: z.enum(AlternativaEtapaProductivaValues, {
    message: "Selecciona la alternativa de Etapa Productiva.",
  }),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export type RegisterAprendizInput = z.infer<typeof RegisterAprendizSchema>;

// Creación de Instructor por parte del Coordinador, o de Coordinador por parte del ADMIN (mismo
// formulario/API en ambos casos, ver src/lib/temp-password.ts). Sin autoregistro público ni
// contraseña elegida por el usuario: se genera una contraseña temporal y se envía por correo.
export const CreateInstructorSchema = z.object({
  ...datosPersonalesBase,
  coordinacion: z.enum(CoordinacionValues, { message: "Selecciona la coordinación." }),
});

export type CreateInstructorInput = z.infer<typeof CreateInstructorSchema>;

// Coordinador lo crea el ADMIN — nunca autoregistro público (era una falla de seguridad:
// cualquiera, incluido un aprendiz, podía crear una cuenta de coordinador). Misma forma que
// CreateInstructorSchema; se mantiene como alias con nombre propio para que la ruta de admin
// sea legible por sí sola.
export const CreateCoordinadorSchema = CreateInstructorSchema;
export type CreateCoordinadorInput = CreateInstructorInput;

export const ProfileSchema = z.object({
  empresaPatrocinadora: z.string().trim().min(2, "Ingresa el nombre de la empresa patrocinadora."),
  direccionEmpresa: z.string().trim().min(5, "Ingresa la dirección de la empresa."),
  nombreCoformador: z.string().trim().min(2, "Ingresa el nombre del coformador."),
  cargoCoformador: z.string().trim().min(2, "Ingresa el cargo del coformador."),
  correoCoformador: z.string().trim().email("Ingresa un correo válido del coformador."),
  celularCoformador: z.string().trim().min(7, "Ingresa un celular válido del coformador."),
});

export type ProfileInput = z.infer<typeof ProfileSchema>;

export const PersonalUpdateSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido."),
  celular: z.string().trim().min(7, "Ingresa un número de celular válido."),
  direccionResidencia: z.string().trim().min(5, "Ingresa tu dirección de residencia."),
});

export type PersonalUpdateInput = z.infer<typeof PersonalUpdateSchema>;

// Recuperación de contraseña: el usuario se identifica con su cédula (dato de ingreso principal),
// el enlace de restablecimiento se envía al correo que tiene registrado en la cuenta.
export const ForgotPasswordSchema = z.object({
  cedula: z.string().trim().min(5, "Ingresa un número de cédula válido."),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Enlace inválido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Confirma tu nueva contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

const todayDateString = () => new Date().toISOString().slice(0, 10);

export const ConcertacionSchema = z
  .object({
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.")
      .refine((fecha) => fecha >= todayDateString(), {
        message: "La fecha no puede ser en el pasado.",
      }),
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de inicio válida."),
    horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de fin válida."),
  })
  .refine((data) => toMinutes(data.horaFin) > toMinutes(data.horaInicio), {
    message: "La hora de fin debe ser posterior a la hora de inicio.",
    path: ["horaFin"],
  })
  .refine((data) => toMinutes(data.horaFin) - toMinutes(data.horaInicio) >= 60, {
    message: "La franja debe durar al menos una hora.",
    path: ["horaFin"],
  });

export type ConcertacionInput = z.infer<typeof ConcertacionSchema>;
