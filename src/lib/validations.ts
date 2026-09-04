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

// Catálogo cerrado de programas de formación ofrecidos por el centro. Lista provista por
// coordinación — cualquier programa nuevo debe agregarse acá antes de poder asignarse a una
// ficha (edición manual o importación desde hoja de cálculo).
export const ProgramasFormacionValues = [
  "ASESORÍA COMERCIAL",
  "ASESORÍA COMERCIAL Y OPERACIONES DE ENTIDADES FINANCIERAS",
  "ASISTENCIA ADMINISTRATIVA",
  "ASISTENCIA EN ORGANIZACION DE ARCHIVOS",
  "ATENCIÓN INTEGRAL AL CLIENTE",
  "CONTABILIZACIÓN DE OPERACIONES COMERCIALES Y FINANCIERAS",
  "COORDINACION DE PROCESOS LOGISTICOS",
  "DESARROLLO DE PROCESOS DE MERCADEO",
  "DIRECCIÓN DE VENTAS",
  "EMPRENDIMIENTO Y FOMENTO EMPRESARIAL",
  "GESTIÓN ADMINISTRATIVA",
  "GESTIÓN BANCARIA Y DE ENTIDADES FINANCIERAS",
  "GESTION BIBLIOTECARIA",
  "GESTIÓN CONTABLE Y DE INFORMACIÓN FINANCIERA",
  "GESTIÓN DE MERCADOS",
  "GESTIÓN DEL TALENTO HUMANO",
  "GESTIÓN DOCUMENTAL",
  "GESTIÓN EMPRESARIAL",
  "GESTIÓN LOGÍSTICA",
  "INFORMACIÓN TURÍSTICA",
  "INTEGRACION DE OPERACIONES LOGISTICAS",
  "NEGOCIACIÓN INTERNACIONAL",
  "OPERACIÓN DE SERVICIOS OMNICANAL EN CONTACT CENTER Y BPO",
  "OPERACIONES COMERCIALES",
  "OPERACIONES DE COMERCIO EXTERIOR",
  "OPERACIONES DE LOGISTICA COMERCIAL EN GRANDES SUPERFICIES",
  "PROCESOS PARA LA COMERCIALIZACIÓN INTERNACIONAL",
  "SERVICIOS COMERCIALES Y FINANCIEROS",
  "SUPERVISIÓN DE VENTAS",
  "VENTA DE PRODUCTOS EN LINEA",
] as const;
export type ProgramaFormacionValue = (typeof ProgramasFormacionValues)[number];

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
  programa: z.enum(ProgramasFormacionValues).nullable().optional(),
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

// Subtipos oficiales de cada alternativa (formato GFPI-F-165), agrupados por la alternativa a la
// que pertenecen. Un subtipo solo es válido junto con su alternativa — ver `subtiposPorAlternativa`
// y el refine de `SeleccionAlternativaSchema`.
export const SubtipoAlternativaEtapaProductivaValues = [
  "CONTRATO_APRENDIZAJE_REGULAR",
  "CONTRATO_APRENDIZAJE_ECONOMIA_POPULAR_CAMPESINA",
  "CONTRATO_APRENDIZAJE_GRUPO_INVESTIGACION",
  "VINCULO_FORMATIVO_ASESORIA_PYMES",
  "VINCULO_FORMATIVO_APOYO_UNIDAD_PRODUCTIVA_FAMILIAR",
  "VINCULO_FORMATIVO_APOYO_INSTITUCION_ESTATAL_ONG",
  "VINCULO_FORMATIVO_GRUPO_INVESTIGACION",
  "VINCULO_FORMATIVO_ECONOMIA_POPULAR_CAMPESINA",
  "MONITORIA_REGULAR",
  "MONITORIA_GRUPO_INVESTIGACION",
  "PROYECTO_SENA_EMPRESA",
  "PROYECTO_SENA_PROVEEDOR_SENA",
  "PROYECTO_PRODUCCION_CENTROS",
  "PROYECTO_ENFOQUE_EMPRESARIAL",
  "PROYECTO_ENFOQUE_IDI",
  "PROYECTO_RUTA_EMPRENDEDORA",
  "PROYECTO_ECONOMIA_POPULAR_CAMPESINA",
  "VINCULO_LABORAL_REGULAR",
  "VINCULO_LABORAL_ECONOMIA_POPULAR_CAMPESINA",
] as const;
export type SubtipoAlternativaEtapaProductivaValue =
  (typeof SubtipoAlternativaEtapaProductivaValues)[number];

export const subtipoAlternativaEtapaProductivaLabel: Record<
  SubtipoAlternativaEtapaProductivaValue,
  string
> = {
  CONTRATO_APRENDIZAJE_REGULAR: "Contrato de aprendizaje (regular)",
  CONTRATO_APRENDIZAJE_ECONOMIA_POPULAR_CAMPESINA: "Economía popular y/o campesina",
  CONTRATO_APRENDIZAJE_GRUPO_INVESTIGACION: "Grupo de Investigación, Desarrollo e Innovación",
  VINCULO_FORMATIVO_ASESORIA_PYMES: "Asesoría a Pymes",
  VINCULO_FORMATIVO_APOYO_UNIDAD_PRODUCTIVA_FAMILIAR: "Apoyo a unidad productiva familiar",
  VINCULO_FORMATIVO_APOYO_INSTITUCION_ESTATAL_ONG:
    "Apoyo a institución estatal, territorial u ONG",
  VINCULO_FORMATIVO_GRUPO_INVESTIGACION: "Grupo de Investigación, Desarrollo e Innovación",
  VINCULO_FORMATIVO_ECONOMIA_POPULAR_CAMPESINA: "Economía popular y/o CampeSENA",
  MONITORIA_REGULAR: "Monitoría (regular)",
  MONITORIA_GRUPO_INVESTIGACION: "Grupo de Investigación, Desarrollo e Innovación",
  PROYECTO_SENA_EMPRESA: "SENA Empresa",
  PROYECTO_SENA_PROVEEDOR_SENA: "SENA Proveedor SENA",
  PROYECTO_PRODUCCION_CENTROS: "Producción de centros",
  PROYECTO_ENFOQUE_EMPRESARIAL: "Enfoque empresarial",
  PROYECTO_ENFOQUE_IDI: "Enfoque I+D+i",
  PROYECTO_RUTA_EMPRENDEDORA: "Ruta emprendedora",
  PROYECTO_ECONOMIA_POPULAR_CAMPESINA: "Economía popular y/o campesina",
  VINCULO_LABORAL_REGULAR: "Vínculo laboral (regular)",
  VINCULO_LABORAL_ECONOMIA_POPULAR_CAMPESINA: "Economía popular y/o campesina",
};

// A qué alternativa pertenece cada subtipo — usado para poblar el desplegable de subtipos según
// la alternativa elegida, y para validar en el servidor que la combinación sea válida.
export const subtiposPorAlternativa: Record<
  AlternativaEtapaProductivaValue,
  SubtipoAlternativaEtapaProductivaValue[]
> = {
  CONTRATO_APRENDIZAJE: [
    "CONTRATO_APRENDIZAJE_REGULAR",
    "CONTRATO_APRENDIZAJE_ECONOMIA_POPULAR_CAMPESINA",
    "CONTRATO_APRENDIZAJE_GRUPO_INVESTIGACION",
  ],
  CONTRATO_VINCULO_FORMATIVO: [
    "VINCULO_FORMATIVO_ASESORIA_PYMES",
    "VINCULO_FORMATIVO_APOYO_UNIDAD_PRODUCTIVA_FAMILIAR",
    "VINCULO_FORMATIVO_APOYO_INSTITUCION_ESTATAL_ONG",
    "VINCULO_FORMATIVO_GRUPO_INVESTIGACION",
    "VINCULO_FORMATIVO_ECONOMIA_POPULAR_CAMPESINA",
  ],
  MONITORIA: ["MONITORIA_REGULAR", "MONITORIA_GRUPO_INVESTIGACION"],
  PROYECTO_PRODUCTIVO: [
    "PROYECTO_SENA_EMPRESA",
    "PROYECTO_SENA_PROVEEDOR_SENA",
    "PROYECTO_PRODUCCION_CENTROS",
    "PROYECTO_ENFOQUE_EMPRESARIAL",
    "PROYECTO_ENFOQUE_IDI",
    "PROYECTO_RUTA_EMPRENDEDORA",
    "PROYECTO_ECONOMIA_POPULAR_CAMPESINA",
  ],
  VINCULO_LABORAL: ["VINCULO_LABORAL_REGULAR", "VINCULO_LABORAL_ECONOMIA_POPULAR_CAMPESINA"],
};

export const TipoSolicitudAlternativaValues = ["SELECCION", "MODIFICACION"] as const;
export type TipoSolicitudAlternativaValue = (typeof TipoSolicitudAlternativaValues)[number];

export const tipoSolicitudAlternativaLabel: Record<TipoSolicitudAlternativaValue, string> = {
  SELECCION: "Selección (primera vez)",
  MODIFICACION: "Modificación",
};

// Evidencia (a): Selección/Modificación de Alternativa de Etapa Productiva (formato GFPI-F-165),
// modo individual — el propio aprendiz la diligencia desde su panel.
export const SeleccionAlternativaSchema = z
  .object({
    tipoSolicitud: z.enum(TipoSolicitudAlternativaValues, {
      message: "Selecciona si es selección o modificación.",
    }),
    alternativa: z.enum(AlternativaEtapaProductivaValues, {
      message: "Selecciona la alternativa de Etapa Productiva.",
    }),
    subtipoAlternativa: z.enum(SubtipoAlternativaEtapaProductivaValues).nullable().optional(),
    fechaInicioEjecucion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha de inicio válida."),
    fechaFinEjecucion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha de fin válida."),
    archivoUrl: z.string().trim().min(1, "Adjunta el formato GFPI-F-165 firmado."),
  })
  .refine((data) => data.fechaFinEjecucion > data.fechaInicioEjecucion, {
    message: "La fecha de fin debe ser posterior a la de inicio.",
    path: ["fechaFinEjecucion"],
  })
  .refine(
    (data) =>
      !data.subtipoAlternativa ||
      subtiposPorAlternativa[data.alternativa].includes(data.subtipoAlternativa),
    {
      message: "Ese subtipo no corresponde a la alternativa seleccionada.",
      path: ["subtipoAlternativa"],
    },
  );

export type SeleccionAlternativaInput = z.infer<typeof SeleccionAlternativaSchema>;

// Modo grupal: un instructor/coordinador diligencia la misma alternativa para varios aprendices
// de una ficha de una sola vez. Reutiliza la misma validación por aprendiz.
export const SeleccionAlternativaGrupalSchema = z.object({
  fichaId: z.string().trim().min(1, "Selecciona la ficha."),
  userIds: z.array(z.string().trim().min(1)).min(1, "Selecciona al menos un aprendiz."),
  tipoSolicitud: z.enum(TipoSolicitudAlternativaValues),
  alternativa: z.enum(AlternativaEtapaProductivaValues),
  subtipoAlternativa: z.enum(SubtipoAlternativaEtapaProductivaValues).nullable().optional(),
  fechaInicioEjecucion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFinEjecucion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  archivoUrl: z.string().trim().min(1, "Adjunta el formato GFPI-F-165 firmado."),
});

export type SeleccionAlternativaGrupalInput = z.infer<typeof SeleccionAlternativaGrupalSchema>;

// Estado del aprendiz durante/después de la Etapa Productiva (enum `EstadoAprendiz`). ACTIVO →
// POR_CERTIFICAR (lo marca el instructor, ver panel de Seguimiento) → CERTIFICADO (paso manual
// de Coordinación — la certificación de estudio se emite fuera del sistema).
export const EstadoAprendizValues = ["ACTIVO", "POR_CERTIFICAR", "CERTIFICADO"] as const;
export type EstadoAprendizValue = (typeof EstadoAprendizValues)[number];

export const estadoAprendizLabel: Record<EstadoAprendizValue, string> = {
  ACTIVO: "Activo",
  POR_CERTIFICAR: "Por certificar",
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

// Datos personales compartidos por los formularios de registro/creación de cuenta (Aprendiz en
// /register; Coordinador e Instructor creados desde el panel de ADMIN/Coordinador respectivamente,
// nunca por autoregistro público). Cada flujo extiende esta base con lo que le aplica.
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

// Creación individual de Aprendiz desde el panel de Instructor, Coordinador o Admin. El
// Instructor solo puede usarla en sus fichas asignadas (verificado en el route handler);
// Coordinador/Admin pueden usarla en cualquier ficha. Sin autoregistro ni contraseña elegida: se
// genera una contraseña temporal (= cédula) igual que para Instructor/Coordinador, ver
// src/lib/temp-password.ts.
export const CreateAprendizSchema = z.object({
  ...datosPersonalesBase,
  fichaId: z.string().trim().min(1, "Selecciona la ficha."),
  alternativaEtapaProductiva: z.enum(AlternativaEtapaProductivaValues, {
    message: "Selecciona la alternativa de Etapa Productiva.",
  }),
});

export type CreateAprendizInput = z.infer<typeof CreateAprendizSchema>;

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

// Sugerencias de tipo de documento certificador para la evidencia (b) — no es una lista cerrada
// (el formato no la cierra a valores fijos), solo ayuda al aprendiz a elegir rápido.
export const TIPOS_DOCUMENTO_FORMALIZACION = [
  "Carta de vínculo laboral",
  "Contrato laboral",
  "Carta de pasantía",
  "Otro",
] as const;

// Evidencia (b): Formalización de la Etapa Productiva — documento certificador (carta de vínculo
// laboral, contrato laboral, carta de pasantía u otro), diligenciado antes del inicio de la EP.
export const FormalizacionSchema = z.object({
  tipoDocumento: z.string().trim().min(2, "Indica el tipo de documento."),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida."),
  archivoUrl: z.string().trim().min(1, "Adjunta el documento certificador."),
});

export type FormalizacionInput = z.infer<typeof FormalizacionSchema>;

// Evidencia (e): Certificación del Empresario — carta de certificación a satisfacción del
// empresario, al cierre de la Etapa Productiva. La fecha del documento debe caer dentro de la
// ventana institucional (5 días antes/después de la fecha de fin de EP del aprendiz) — se valida
// en el servidor, donde sí se conoce esa fecha (ver /api/etapa-productiva/certificacion).
export const CertificacionEmpresarioSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida."),
  archivoUrl: z.string().trim().min(1, "Adjunta la carta de certificación."),
});

export type CertificacionEmpresarioInput = z.infer<typeof CertificacionEmpresarioSchema>;

// Días de tolerancia antes/después de la fecha de fin de Etapa Productiva del aprendiz dentro de
// los cuales puede datarse la carta de certificación del empresario.
export const VENTANA_CERTIFICACION_DIAS = 5;

export const NivelRiesgoARLValues = ["I", "II", "III", "IV", "V"] as const;
export type NivelRiesgoARLValue = (typeof NivelRiesgoARLValues)[number];

export const nivelRiesgoARLLabel: Record<NivelRiesgoARLValue, string> = {
  I: "I",
  II: "II",
  III: "III",
  IV: "IV",
  V: "V",
};

export const TipoCompetenciaValues = ["TECNICA", "BASICA_CLAVE"] as const;
export type TipoCompetenciaValue = (typeof TipoCompetenciaValues)[number];

export const tipoCompetenciaLabel: Record<TipoCompetenciaValue, string> = {
  TECNICA: "Técnica",
  BASICA_CLAVE: "Básica y/o clave",
};

// Catálogo de competencias/resultados de aprendizaje por programa (ver src/lib/competencias-import.ts
// para la importación masiva) — este schema es para el alta/edición manual de una fila suelta.
export const CompetenciaFormacionSchema = z.object({
  programa: z.enum(ProgramasFormacionValues, { message: "Selecciona el programa de formación." }),
  tipo: z.enum(TipoCompetenciaValues, { message: "Selecciona el tipo de competencia." }),
  codigoCompetencia: z.string().trim().min(1, "Ingresa el código de la competencia."),
  nombreCompetencia: z.string().trim().min(2, "Ingresa el nombre de la competencia."),
  resultadoAprendizaje: z.string().trim().min(2, "Ingresa el resultado de aprendizaje."),
  horas: z.number().int().positive().nullable().optional(),
  redConocimiento: z.string().trim().nullable().optional(),
});

export type CompetenciaFormacionInput = z.infer<typeof CompetenciaFormacionSchema>;

// Evidencia (c): fila de la tabla "Descripción de las actividades realizadas" de una bitácora
// (formato GFPI-F-147) — se pueden agregar cuantas sean necesarias, mínimo una.
// Sin fechaInicio/fechaFin propias: el formato pide el mismo período que ya cubre la bitácora
// (periodoDesde/periodoHasta), así que el servidor las deriva de ahí en vez de pedirlas dos veces.
export const BitacoraActividadSchema = z.object({
  descripcion: z.string().trim().min(2, "Describe la actividad."),
  competencias: z.string().trim().nullable().optional(),
  evidenciaCumplimiento: z.string().trim().nullable().optional(),
  observaciones: z.string().trim().nullable().optional(),
});

export type BitacoraActividadInput = z.infer<typeof BitacoraActividadSchema>;

// Evidencia (c): Bitácora quincenal del aprendiz. `numero` (1-12) identifica cuál de las
// bitácoras se está diligenciando; la fecha límite se calcula en el servidor, no se recibe acá.
export const BitacoraSchema = z.object({
  numero: z.number().int().min(1).max(12),
  periodoDesde: z.string().trim().nullable().optional(),
  periodoHasta: z.string().trim().nullable().optional(),
  archivoUrl: z.string().trim().min(1, "Adjunta la bitácora diligenciada."),
  arlAfiliado: z.boolean().nullable().optional(),
  arlNivelRiesgo: z.enum(NivelRiesgoARLValues).nullable().optional(),
  arlRiesgoCorresponde: z.boolean().nullable().optional(),
  arlTieneEPP: z.boolean().nullable().optional(),
  actividades: z.array(BitacoraActividadSchema).min(1, "Agrega al menos una actividad."),
});

export type BitacoraInput = z.infer<typeof BitacoraSchema>;

export const ModalidadEjecucionEPValues = ["PRESENCIAL", "VIRTUAL"] as const;
export type ModalidadEjecucionEPValue = (typeof ModalidadEjecucionEPValues)[number];
export const modalidadEjecucionEPLabel: Record<ModalidadEjecucionEPValue, string> = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
};

export const ValoracionVariableValues = ["SATISFACTORIO", "POR_MEJORAR"] as const;
export type ValoracionVariableValue = (typeof ValoracionVariableValues)[number];
export const valoracionVariableLabel: Record<ValoracionVariableValue, string> = {
  SATISFACTORIO: "Satisfactorio",
  POR_MEJORAR: "Por mejorar",
};

export const JuicioEtapaProductivaValues = ["APROBADO", "NO_APROBADO"] as const;
export type JuicioEtapaProductivaValue = (typeof JuicioEtapaProductivaValues)[number];
export const juicioEtapaProductivaLabel: Record<JuicioEtapaProductivaValue, string> = {
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
};

// Evidencia (d): agenda de la reunión de Momento 2 (seguimiento) o Momento 3 (cierre) — mismo
// patrón de fecha/franja horaria que la Concertación (Momento 1), agendada por el aprendiz.
export const EvaluacionAgendaSchema = z
  .object({
    numero: z.union([z.literal(2), z.literal(3)]),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.")
      .refine((fecha) => fecha >= todayDateString(), {
        message: "La fecha no puede ser en el pasado.",
      }),
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de inicio válida."),
    horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de fin válida."),
    modalidad: z.enum(ModalidadEjecucionEPValues),
  })
  .refine((data) => toMinutes(data.horaFin) > toMinutes(data.horaInicio), {
    message: "La hora de fin debe ser posterior a la hora de inicio.",
    path: ["horaFin"],
  })
  .refine((data) => toMinutes(data.horaFin) - toMinutes(data.horaInicio) >= 60, {
    message: "La franja debe durar al menos una hora.",
    path: ["horaFin"],
  });

export type EvaluacionAgendaInput = z.infer<typeof EvaluacionAgendaSchema>;

// El aprendiz agrega su propia reflexión en el Momento 3 (cierre) — el resto del contenido de
// la evaluación lo diligencia el instructor (ver EvaluacionRubricaSchema).
export const EvaluacionRetroAprendizSchema = z.object({
  retroalimentacionAprendiz: z.string().trim().min(1, "Escribe tu comentario."),
});

// Evidencia (d): el instructor registra la evaluación (rúbrica de 13 variables + retroalimentación
// y, en el Momento 3, el juicio final) — coherente con su rol ("revisa y califica evidencias,
// registra evaluaciones") en docs/REQUISITOS-FUNCIONALES.md sección 2. `finalizar` distingue
// guardar como borrador (sigue editable) de cerrar la evaluación (ya no se puede seguir editando).
export const EvaluacionRubricaSchema = z.object({
  variables: z
    .array(
      z.object({
        variable: z.enum([
          "APLICACION_CONOCIMIENTO",
          "MEJORA_CONTINUA",
          "FORTALECIMIENTO_OCUPACIONAL",
          "OPORTUNIDAD_CALIDAD",
          "RESPONSABILIDAD_AMBIENTAL",
          "ADMINISTRACION_RECURSOS",
          "SEGURIDAD_SALUD_TRABAJO",
          "DOCUMENTACION_ETAPA_PRODUCTIVA",
          "RELACIONES_INTERPERSONALES",
          "TRABAJO_EQUIPO",
          "SOLUCION_PROBLEMAS",
          "CUMPLIMIENTO",
          "ORGANIZACION",
        ]),
        valoracion: z.enum(ValoracionVariableValues).nullable().optional(),
        observaciones: z.string().trim().nullable().optional(),
      })
    )
    .length(13, "Faltan variables de la rúbrica."),
  retroalimentacionInstructor: z.string().trim().nullable().optional(),
  retroalimentacionCoformador: z.string().trim().nullable().optional(),
  juicioFinal: z.enum(JuicioEtapaProductivaValues).nullable().optional(),
  finalizar: z.boolean(),
});

export type EvaluacionRubricaInput = z.infer<typeof EvaluacionRubricaSchema>;
