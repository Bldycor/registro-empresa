import { z } from "zod";
import { toMinutes } from "@/lib/time";
import { VARIABLES_PLANEACION } from "@/lib/concertacion-variables";

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
  "VIRTUALIDAD",
] as const;
export type CoordinacionValue = (typeof CoordinacionValues)[number];

export const coordinacionLabel: Record<CoordinacionValue, string> = {
  CONTABILIDAD_FINANZAS: "Contabilidad y Finanzas",
  COMERCIO_VENTAS: "Comercio y Ventas",
  GESTION_ADMINISTRATIVA_DOCUMENTAL: "Gestión Administrativa y Documental",
  VIRTUALIDAD: "Virtualidad",
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

// Reglamento del aprendiz que rige a la ficha (enum `ReglamentoAprendiz`). Define si aplica el
// plazo de 24 meses del Acuerdo 007 de 2012 (ver src/lib/plazo-culminacion.ts).
export const ReglamentoAprendizValues = ["ACUERDO_007_2012", "ACUERDO_009_2024"] as const;
export type ReglamentoAprendizValue = (typeof ReglamentoAprendizValues)[number];
export const reglamentoAprendizLabel: Record<ReglamentoAprendizValue, string> = {
  ACUERDO_007_2012: "Acuerdo 007 de 2012",
  ACUERDO_009_2024: "Acuerdo 009 de 2024",
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
  reglamento: z.enum(ReglamentoAprendizValues).nullable().optional(),
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

// Máximo de cambios de alternativa que la guía GFPI-G-040 §9.3.1 le permite a un aprendiz
// durante todo su proceso formativo ("hasta tres (3) modificaciones"), siempre con aval de
// Coordinación. Se valida al crear la solicitud, no al avalarla.
export const MAX_CAMBIOS_ALTERNATIVA = 3;

// Motivos por los que se puede interrumpir el tramo de Etapa Productiva en curso. Los seis
// primeros son las causales justificadas que enumera la guía GFPI-G-040 §9.3.1 para avalar el
// cambio de alternativa; los tres siguientes, las novedades de §9.3 que la suspenden.
export const MotivoInterrupcionEPValues = [
  "LIQUIDACION_EMPRESA",
  "SALUD_CERTIFICADA",
  "ASUNTOS_JUDICIALES",
  "SERVICIO_MILITAR",
  "DESPLAZAMIENTO_GEOGRAFICO",
  "TERMINACION_ANTICIPADA_CONTRATO",
  "LICENCIA_MATERNIDAD",
  "INCAPACIDAD",
  "FUERZA_MAYOR",
  "RENUNCIA_VOLUNTARIA",
  "OTRO",
] as const;
export type MotivoInterrupcionEPValue = (typeof MotivoInterrupcionEPValues)[number];

export const motivoInterrupcionEPLabel: Record<MotivoInterrupcionEPValue, string> = {
  LIQUIDACION_EMPRESA: "Liquidación o cierre de la empresa",
  SALUD_CERTIFICADA: "Salud (certificada por la EPS)",
  ASUNTOS_JUDICIALES: "Asuntos judiciales",
  SERVICIO_MILITAR: "Prestación del servicio militar",
  DESPLAZAMIENTO_GEOGRAFICO: "Desplazamiento a otra región, ciudad o país",
  TERMINACION_ANTICIPADA_CONTRATO: "Terminación anticipada del contrato por el ente co-formador",
  LICENCIA_MATERNIDAD: "Licencia de maternidad",
  INCAPACIDAD: "Incapacidad médica",
  FUERZA_MAYOR: "Caso fortuito o fuerza mayor",
  RENUNCIA_VOLUNTARIA: "Renuncia voluntaria del aprendiz",
  OTRO: "Otro motivo",
};

// Reporte de interrupción del tramo de Etapa Productiva en curso (guía GFPI-G-040 §9.3/§9.3.1).
// Lo radica el propio aprendiz; el certificado de práctica parcial del ente co-formador es el
// soporte del tiempo ya cumplido, que después se descuenta del tramo siguiente.
export const InterrupcionEPSchema = z
  .object({
    fechaInterrupcion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha del último día de práctica."),
    motivo: z.enum(MotivoInterrupcionEPValues, { message: "Selecciona el motivo." }),
    motivoDetalle: z.string().trim().max(500).nullable().optional(),
    certificadoUrl: z.string().trim().nullable().optional(),
  })
  .refine((d) => d.motivo !== "OTRO" || Boolean(d.motivoDetalle?.trim()), {
    message: "Describe el motivo.",
    path: ["motivoDetalle"],
  });

export type InterrupcionEPInput = z.infer<typeof InterrupcionEPSchema>;

// Aval de Coordinación sobre la interrupción. `diasEjecutados` llega por separado porque el
// certificado del ente co-formador manda sobre el calendario: Coordinación puede corregir los
// días sugeridos antes de acumularlos (§9.3.1, "analizarán la cantidad de horas que ejecutó").
export const AvalInterrupcionEPSchema = z.object({
  estado: z.enum(["APROBADA", "RECHAZADA"]),
  diasEjecutados: z.number().int().min(0).max(400).optional(),
  observacionesAval: z.string().trim().nullable().optional(),
});

// Novedades que suspenden temporalmente la Etapa Productiva sin terminarla (guía GFPI-G-040
// §9.3). Distintas de las de interrupción: aquí el aprendiz vuelve con la misma alternativa.
export const MotivoAplazamientoEPValues = [
  "LICENCIA_MATERNIDAD",
  "INCAPACIDAD_MEDICA",
  "VACACIONES_COLECTIVAS",
  "CESE_ACTIVIDAD_EMPRESA",
  "FUERZA_MAYOR",
  "OTRO",
] as const;
export type MotivoAplazamientoEPValue = (typeof MotivoAplazamientoEPValues)[number];

export const motivoAplazamientoEPLabel: Record<MotivoAplazamientoEPValue, string> = {
  LICENCIA_MATERNIDAD: "Licencia de maternidad",
  INCAPACIDAD_MEDICA: "Incapacidad médica",
  VACACIONES_COLECTIVAS: "Vacaciones colectivas de la empresa",
  CESE_ACTIVIDAD_EMPRESA: "Cese de actividad de la empresa",
  FUERZA_MAYOR: "Caso fortuito o fuerza mayor",
  OTRO: "Otra novedad",
};

// Solicitud de aplazamiento radicada por el aprendiz.
export const AplazamientoEPSchema = z
  .object({
    fechaSuspension: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona el último día de práctica antes de la novedad."),
    fechaReanudacionPrevista: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha prevista de reanudación."),
    motivo: z.enum(MotivoAplazamientoEPValues, { message: "Selecciona el motivo." }),
    motivoDetalle: z.string().trim().max(500).nullable().optional(),
    soporteUrl: z.string().trim().nullable().optional(),
  })
  .refine((d) => d.fechaReanudacionPrevista > d.fechaSuspension, {
    message: "La reanudación debe ser posterior al último día de práctica.",
    path: ["fechaReanudacionPrevista"],
  })
  .refine((d) => d.motivo !== "OTRO" || Boolean(d.motivoDetalle?.trim()), {
    message: "Describe la novedad.",
    path: ["motivoDetalle"],
  });

export type AplazamientoEPInput = z.infer<typeof AplazamientoEPSchema>;

// Aval del Comité de Evaluación y Seguimiento. El acta es obligatoria al aprobar: el Comité es un
// cuerpo colegiado y quien registra el aval en SEPA solo está transcribiendo su decisión, así que
// sin número y fecha de acta el aplazamiento no tiene soporte institucional (§9.3).
export const AvalAplazamientoEPSchema = z
  .object({
    estado: z.enum(["APROBADA", "RECHAZADA"]),
    diasEjecutados: z.number().int().min(0).max(400).optional(),
    observacionesAval: z.string().trim().nullable().optional(),
    actaComite: z.string().trim().max(120).nullable().optional(),
    fechaActaComite: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha del acta.")
      .nullable()
      .optional(),
  })
  .refine((d) => d.estado !== "APROBADA" || Boolean(d.actaComite?.trim()), {
    message: "Registra el acta del Comité que autoriza el aplazamiento.",
    path: ["actaComite"],
  })
  .refine((d) => d.estado !== "APROBADA" || Boolean(d.fechaActaComite), {
    message: "Registra la fecha del acta del Comité.",
    path: ["fechaActaComite"],
  });

// Registro de la reanudación: el aprendiz vuelve y arranca el tramo por el tiempo que le faltaba.
export const ReanudacionEPSchema = z.object({
  fechaReanudacionReal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha real de reanudación."),
});

// Declaración (o reversión) de deserción por Coordinación — guía GFPI-G-040 §9.1.1. El motivo es
// obligatorio al declararla: queda como constancia del acto administrativo.
export const DesercionSchema = z
  .object({
    desertor: z.boolean(),
    motivoDesercion: z.string().trim().max(500).nullable().optional(),
  })
  .refine((d) => !d.desertor || Boolean(d.motivoDesercion?.trim()), {
    message: "Indica la causa de la deserción.",
    path: ["motivoDesercion"],
  });

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
export const EstadoAprendizValues = [
  "ACTIVO",
  "PRACTICA_INTERRUMPIDA",
  "APLAZADA",
  "POR_CERTIFICAR",
  "CERTIFICADO",
  "DESERTADO",
] as const;
export type EstadoAprendizValue = (typeof EstadoAprendizValues)[number];

export const estadoAprendizLabel: Record<EstadoAprendizValue, string> = {
  ACTIVO: "Activo",
  PRACTICA_INTERRUMPIDA: "Práctica interrumpida",
  APLAZADA: "Práctica aplazada",
  POR_CERTIFICAR: "Por certificar",
  CERTIFICADO: "Certificado",
  DESERTADO: "Desertó",
};

// Estados en los que el reloj de plazos del aprendiz está detenido: no se le cuentan evidencias
// atrasadas porque no tiene cómo entregarlas — está esperando una alternativa nueva o el fin de
// una novedad (guía GFPI-G-040 §9.3), o ya salió del proceso. Un solo punto de verdad para que el
// semáforo, las insignias del nav y los paneles no se contradigan entre sí.
export const detalleDetencionPlazos: Partial<Record<EstadoAprendizValue, string>> = {
  PRACTICA_INTERRUMPIDA: "Práctica interrumpida",
  APLAZADA: "Práctica aplazada",
  DESERTADO: "Desertó del proceso",
};

// Fecha "YYYY-MM-DD" (formato que ya usa DatePickerField), opcional/nullable: se puede dejar sin
// definir o borrar (null) tanto al crear como al editar un aprendiz.
const fechaEtapaProductivaOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.")
  .nullable()
  .optional();

// Edición de los datos de un aprendiz por el Coordinador (o el ADMIN): datos personales, estado
// y asignación de ficha — incluye poder desasignarlo (fichaId a null) para un aprendiz que quede
// sin ficha, o reasignarlo a otra. Todo opcional: se envía solo lo que cambia. Las fechas de
// Etapa Productiva son por aprendiz (no por ficha) — se pueden fijar o corregir aquí uno a uno,
// además de sincronizarse desde la evidencia "Selección de Alternativa" cuando el aprendiz la
// diligencia (la última aprobada gana).
// Cuántas bitácoras le corresponden al aprendiz. La Etapa Productiva SIEMPRE dura 6 meses; lo
// que cambia es la frecuencia de entrega: 12 (una cada 15 días) o 6 (una por mes). Afecta las
// fechas límite calculadas y las alertas de seguimiento (ver src/lib/bitacora-fechas.ts y
// src/lib/seguimiento-evidencias.ts).
export const TotalBitacorasValues = [6, 12] as const;
export type TotalBitacorasValue = (typeof TotalBitacorasValues)[number];
const totalBitacorasOpcional = z.union([z.literal(6), z.literal(12)]).optional();

export const AprendizGestionSchema = z
  .object({
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
    fechaInicioEtapaProductiva: fechaEtapaProductivaOpcional,
    fechaFinEtapaProductiva: fechaEtapaProductivaOpcional,
    totalBitacoras: totalBitacorasOpcional,
    // Requisitos de aval de §9.1.1 que verifica Coordinación. `rapsEtapaLectivaAprobados` admite
    // null a propósito: "sin verificar" no es lo mismo que "no cumple".
    fechaNacimiento: fechaEtapaProductivaOpcional,
    rapsEtapaLectivaAprobados: z.boolean().nullable().optional(),
    autorizacionMinTrabajoUrl: z.string().trim().nullable().optional(),
  })
  .refine(
    (data) =>
      !data.fechaInicioEtapaProductiva ||
      !data.fechaFinEtapaProductiva ||
      data.fechaFinEtapaProductiva > data.fechaInicioEtapaProductiva,
    { message: "La fecha de fin debe ser posterior a la de inicio.", path: ["fechaFinEtapaProductiva"] },
  );

export type AprendizGestionInput = z.infer<typeof AprendizGestionSchema>;

// El instructor corrige las fechas de Etapa Productiva de UN aprendiz de su ficha (el sistema ya
// las calculó al crear la cuenta — ver src/lib/etapa-productiva-fechas.ts). Ambas opcionales:
// puede fijar solo una, o borrar las dos (null) si la ficha todavía no tiene fecha institucional.
// El total de bitácoras (6/12) se corrige en el mismo formulario, por eso vive en este schema.
export const FechasEtapaProductivaSchema = z
  .object({
    fechaInicioEtapaProductiva: fechaEtapaProductivaOpcional,
    fechaFinEtapaProductiva: fechaEtapaProductivaOpcional,
    totalBitacoras: totalBitacorasOpcional,
  })
  .refine(
    (data) =>
      !data.fechaInicioEtapaProductiva ||
      !data.fechaFinEtapaProductiva ||
      data.fechaFinEtapaProductiva > data.fechaInicioEtapaProductiva,
    { message: "La fecha de fin debe ser posterior a la de inicio.", path: ["fechaFinEtapaProductiva"] },
  );

export type FechasEtapaProductivaInput = z.infer<typeof FechasEtapaProductivaSchema>;

// El instructor aplica la misma fecha de inicio (y opcionalmente de fin) a TODOS los aprendices
// de una de sus fichas de una sola vez — para corregir en bloque una ficha completa en vez de
// aprendiz por aprendiz. La fecha de inicio es obligatoria acá (no tendría sentido "limpiar" a
// todo un grupo); si no se da fecha de fin, se calcula sola (+180 días, ver
// src/lib/etapa-productiva-fechas.ts). El total de bitácoras también se puede aplicar en bloque.
export const FechasEtapaProductivaFichaSchema = z
  .object({
    fechaInicioEtapaProductiva: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha de inicio válida."),
    fechaFinEtapaProductiva: fechaEtapaProductivaOpcional,
    totalBitacoras: totalBitacorasOpcional,
  })
  .refine(
    (data) => !data.fechaFinEtapaProductiva || data.fechaFinEtapaProductiva > data.fechaInicioEtapaProductiva,
    { message: "La fecha de fin debe ser posterior a la de inicio.", path: ["fechaFinEtapaProductiva"] },
  );

export type FechasEtapaProductivaFichaInput = z.infer<typeof FechasEtapaProductivaFichaSchema>;

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
// src/lib/temp-password.ts. Las fechas de Etapa Productiva NO se piden acá: el sistema las
// calcula solas desde `Ficha.fechaInicioProductiva` (ver src/lib/etapa-productiva-fechas.ts) — el
// instructor las corrige después, individualmente o para toda la ficha, si hace falta.
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

// Evidencia (c): Bitácora del aprendiz. `numero` identifica cuál de las bitácoras se
// está diligenciando; la fecha límite se calcula en el servidor, no se recibe acá. El tope real
// (6 o 12, ver `User.totalBitacoras`) varía por aprendiz, así que se valida en el route handler,
// no acá — el límite de 12 es solo un techo razonable contra datos claramente inválidos.
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

// Reunión extraordinaria (requisito §3.2): la pide el aprendiz o el coformador cuando hay un
// problema o una eventualidad. El aprendiz la agenda con fecha, franja y motivo; el instructor la
// aprueba o la rechaza, y solo al aprobarla sale la citación a todos (decisión de Coordinación).
// Se guarda como `Evaluacion` con `esExtraordinario` y numero 0: no lleva rúbrica ni cuenta para
// el semáforo ni para "Por certificar".
export const NUMERO_REUNION_EXTRAORDINARIA = 0;

export const SolicitanteReunionValues = ["APRENDIZ", "COFORMADOR"] as const;
export type SolicitanteReunionValue = (typeof SolicitanteReunionValues)[number];
export const solicitanteReunionLabel: Record<SolicitanteReunionValue, string> = {
  APRENDIZ: "El aprendiz",
  COFORMADOR: "El coformador",
};

export const ReunionExtraordinariaSchema = z
  .object({
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.")
      .refine((fecha) => fecha >= todayDateString(), {
        message: "La fecha no puede ser en el pasado.",
      }),
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de inicio válida."),
    horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de fin válida."),
    modalidad: z.enum(ModalidadEjecucionEPValues, { message: "Selecciona la modalidad." }),
    motivo: z
      .string()
      .trim()
      .min(10, "Explica el motivo de la reunión (mínimo 10 caracteres).")
      .max(500, "El motivo no puede pasar de 500 caracteres."),
    solicitadaPor: z.enum(SolicitanteReunionValues, { message: "Indica quién pide la reunión." }),
  })
  .refine((data) => toMinutes(data.horaFin) > toMinutes(data.horaInicio), {
    message: "La hora de fin debe ser posterior a la hora de inicio.",
    path: ["horaFin"],
  })
  .refine((data) => toMinutes(data.horaFin) - toMinutes(data.horaInicio) >= 60, {
    message: "La franja debe durar al menos una hora.",
    path: ["horaFin"],
  });

// El instructor reprograma una reunión (requisito §3.2: la reprogramación la puede hacer
// cualquiera de las partes). `tipo` dice en qué tabla vive: la Concertación (Momento 1) o una
// `Evaluacion` (Momentos 2 y 3, y reuniones extraordinarias). Que la fecha no sea pasada se revisa
// en la ruta, con el día de Colombia.
export const ReprogramarReunionSchema = z
  .object({
    tipo: z.enum(["CONCERTACION", "EVALUACION"]),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida."),
    horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de inicio válida."),
    horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona una hora de fin válida."),
    motivo: z.string().trim().max(300, "El motivo no puede pasar de 300 caracteres.").nullable().optional(),
  })
  .refine((data) => toMinutes(data.horaFin) > toMinutes(data.horaInicio), {
    message: "La hora de fin debe ser posterior a la hora de inicio.",
    path: ["horaFin"],
  })
  .refine((data) => toMinutes(data.horaFin) - toMinutes(data.horaInicio) >= 60, {
    message: "La franja debe durar al menos una hora.",
    path: ["horaFin"],
  });

// Respuesta del instructor. Rechazar exige una nota: es lo que el aprendiz lee para saber por qué
// y proponer otra fecha.
export const DecisionExtraordinariaSchema = z
  .object({
    estado: z.enum(["APROBADA", "RECHAZADA"]),
    observaciones: z.string().trim().max(500).nullable().optional(),
  })
  .refine((d) => d.estado !== "RECHAZADA" || Boolean(d.observaciones?.trim()), {
    message: "Indícale al aprendiz por qué no se aprueba.",
    path: ["observaciones"],
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

// El instructor también valora el Momento 1 (Concertación) — 6 variables sobre la calidad de la
// planeación acordada, ver `VariablePlaneacionEP`/`concertacion-variables.ts`. Mismo patrón de
// "borrador" vs "finalizar" que `EvaluacionRubricaSchema`, sin retroalimentación ni juicio final
// (esos solo aplican al cierre de la etapa productiva, Momento 3).
export const ConcertacionRubricaSchema = z.object({
  variables: z
    .array(
      z.object({
        variable: z.enum(VARIABLES_PLANEACION),
        valoracion: z.enum(ValoracionVariableValues).nullable().optional(),
        observaciones: z.string().trim().nullable().optional(),
      })
    )
    .length(VARIABLES_PLANEACION.length, "Faltan variables de la valoración."),
  // Competencias y resultados de aprendizaje concertados con el aprendiz, elegidos del catálogo
  // de su programa (ver `/api/instructor/competencias`) — texto ya combinado (una por línea), no
  // estructurado, porque `ConcertacionFuncion.competenciasDesarrollar`/`resultadosAprendizaje` son
  // campos de texto libre.
  competenciasDesarrollar: z.string().trim().nullable().optional(),
  resultadosAprendizaje: z.string().trim().nullable().optional(),
  finalizar: z.boolean(),
});

export type ConcertacionRubricaInput = z.infer<typeof ConcertacionRubricaSchema>;
