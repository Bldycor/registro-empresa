import { prisma } from "@/lib/prisma";
import {
  alternativaEtapaProductivaLabel,
  jornadaLabel,
  modalidadEjecucionEPLabel,
  nivelFormacionLabel,
  subtipoAlternativaEtapaProductivaLabel,
  type AlternativaEtapaProductivaValue,
  type JornadaValue,
  type ModalidadEjecucionEPValue,
  type NivelFormacionValue,
  type SubtipoAlternativaEtapaProductivaValue,
} from "@/lib/validations";

// Formato GFPI-F-023 «Planeación, Seguimiento y Evaluación de Etapa Productiva», diligenciado con
// lo que SEPA ya guarda. Sirve para la vista previa que el aprendiz revisa antes de enviar cada
// momento, y para dejar constancia de con qué datos se armó.
//
// REGLA: lo que el sistema no sabe queda **vacío**. Nunca se completa con un valor de ejemplo ni
// se deduce: un formato institucional con un dato inventado es peor que uno incompleto. Los campos
// que la plantilla pide y no salen de ninguna tabla los escribe el aprendiz una sola vez y viven
// en `DatosFormatoEP` (decisión de Coordinación, 28 sep 2026).

export type CampoFormato = { etiqueta: string; valor: string | null };
export type BloqueFormato = { titulo: string; campos: CampoFormato[] };

const MODALIDAD_FORMACION: Record<string, string> = {
  PRESENCIAL: "Presencial",
  VIRTUAL: "Virtual",
  A_DISTANCIA: "A distancia",
};

const TIPO_DOCUMENTO: Record<string, string> = {
  CC: "Cédula de ciudadanía",
  TI: "Tarjeta de identidad",
  NUIP: "NUIP",
  CE: "Cédula de extranjería",
  PEP: "PEP",
  OTRO: "Otro",
};

// Día de calendario guardado a medianoche UTC: se muestra tal cual, sin correrlo de zona.
function dia(fecha: Date | null): string | null {
  return fecha
    ? fecha.toLocaleDateString("es-CO", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" })
    : null;
}

function limpio(valor: string | null | undefined): string | null {
  const v = (valor ?? "").trim();
  return v.length > 0 ? v : null;
}

export const SELECT_FORMATO = {
  id: true,
  nombres: true,
  apellidos: true,
  tipoDocumento: true,
  cedula: true,
  celular: true,
  direccionResidencia: true,
  email: true,
  fechaInicioEtapaProductiva: true,
  fechaFinEtapaProductiva: true,
  ficha: {
    select: {
      codigo: true,
      programa: true,
      nivelFormacion: true,
      jornada: true,
      modalidadFormacion: true,
      fechaFinFormacion: true,
      instructor: { select: { nombres: true, apellidos: true, celular: true, email: true } },
    },
  },
  companyProfile: {
    select: {
      empresaPatrocinadora: true,
      direccionEmpresa: true,
      nombreCoformador: true,
      cargoCoformador: true,
      correoCoformador: true,
      celularCoformador: true,
    },
  },
  datosFormatoEP: true,
  seleccionesAlternativa: {
    where: { estado: "APROBADA" as const },
    select: { alternativa: true, subtipoAlternativa: true, registroSofiaPlus: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} as const;

type AprendizFormato = Awaited<ReturnType<typeof cargarAprendiz>>;

async function cargarAprendiz(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: SELECT_FORMATO });
}

// Los tres bloques de cabecera del formato, iguales para los tres momentos.
export function encabezadoFormato(a: NonNullable<AprendizFormato>): BloqueFormato[] {
  const d = a.datosFormatoEP;
  const f = a.ficha;
  const e = a.companyProfile;
  const alternativa = a.seleccionesAlternativa[0];

  const alternativaTexto = alternativa
    ? [
        alternativaEtapaProductivaLabel[alternativa.alternativa as AlternativaEtapaProductivaValue],
        alternativa.subtipoAlternativa
          ? subtipoAlternativaEtapaProductivaLabel[
              alternativa.subtipoAlternativa as SubtipoAlternativaEtapaProductivaValue
            ]
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return [
    {
      titulo: "Información general",
      campos: [
        { etiqueta: "Regional", valor: limpio(d?.regional) },
        { etiqueta: "Centro de formación", valor: limpio(d?.centroFormacion) },
        {
          etiqueta: "Nivel formativo",
          valor: f?.nivelFormacion ? nivelFormacionLabel[f.nivelFormacion as NivelFormacionValue] : null,
        },
        { etiqueta: "Programa de formación", valor: limpio(f?.programa) },
        { etiqueta: "N.° de grupo (ficha)", valor: limpio(f?.codigo) },
        {
          etiqueta: "Modalidad de formación",
          valor: f?.modalidadFormacion ? (MODALIDAD_FORMACION[f.modalidadFormacion] ?? null) : null,
        },
        { etiqueta: "Estrategia formativa", valor: limpio(d?.estrategiaFormativa) },
        { etiqueta: "Jornada", valor: f?.jornada ? jornadaLabel[f.jornada as JornadaValue] : null },
        { etiqueta: "Fecha fin de la etapa lectiva", valor: dia(f?.fechaFinFormacion ?? null) },
      ],
    },
    {
      titulo: "Datos del aprendiz",
      campos: [
        { etiqueta: "Nombre completo", valor: `${a.nombres} ${a.apellidos}`.trim() },
        {
          etiqueta: "Tipo de documento",
          valor: a.tipoDocumento ? (TIPO_DOCUMENTO[a.tipoDocumento] ?? null) : null,
        },
        { etiqueta: "N.° de identificación", valor: a.cedula },
        { etiqueta: "Contacto telefónico", valor: limpio(a.celular) },
        { etiqueta: "Dirección", valor: limpio(a.direccionResidencia) },
        { etiqueta: "Correo electrónico personal", valor: limpio(a.email) },
        { etiqueta: "Correo electrónico institucional", valor: limpio(d?.correoInstitucional) },
        { etiqueta: "Alternativa de etapa productiva registrada", valor: alternativaTexto },
        { etiqueta: "Fecha de registro en SofiaPlus", valor: dia(alternativa?.registroSofiaPlus ?? null) },
      ],
    },
    {
      titulo: "Instructor de seguimiento",
      campos: [
        {
          etiqueta: "Nombre",
          valor: f?.instructor ? `${f.instructor.nombres} ${f.instructor.apellidos}`.trim() : null,
        },
        { etiqueta: "Contacto telefónico", valor: limpio(f?.instructor?.celular) },
        { etiqueta: "Correo electrónico institucional", valor: limpio(f?.instructor?.email) },
      ],
    },
    {
      titulo: "Ente co-formador",
      campos: [
        { etiqueta: "Nombre de la empresa o entidad", valor: limpio(e?.empresaPatrocinadora) },
        { etiqueta: "Dirección", valor: limpio(e?.direccionEmpresa) },
        { etiqueta: "NIT", valor: limpio(d?.nitEmpresa) },
        { etiqueta: "Correo electrónico", valor: limpio(e?.correoCoformador) },
        { etiqueta: "Jefe inmediato / co-formador / tutor", valor: limpio(e?.nombreCoformador) },
        { etiqueta: "Cargo", valor: limpio(e?.cargoCoformador) },
        { etiqueta: "Contacto telefónico", valor: limpio(e?.celularCoformador) },
      ],
    },
    ...(limpio(d?.asistenciaNombre) || limpio(d?.asistenciaTipo) || limpio(d?.asistenciaContacto)
      ? [
          {
            titulo: "Persona en situación de discapacidad (si aplica)",
            campos: [
              { etiqueta: "Nombre de quien asiste al aprendiz", valor: limpio(d?.asistenciaNombre) },
              { etiqueta: "Tipo de asistencia", valor: limpio(d?.asistenciaTipo) },
              { etiqueta: "Contacto telefónico", valor: limpio(d?.asistenciaContacto) },
            ],
          },
        ]
      : []),
  ];
}

export type FormatoMomento = {
  momento: 1 | 2 | 3;
  titulo: string;
  encabezado: BloqueFormato[];
  // Datos propios del momento que ya están guardados.
  detalle: CampoFormato[];
  // Textos largos del momento (plan de trabajo, retroalimentaciones).
  textos: { titulo: string; cuerpo: string | null }[];
  // Rúbrica de los Momentos 2 y 3, tal como la valoró el instructor. Vacía mientras no la registre.
  variables: { categoria: "TECNICO" | "ACTITUDINAL"; nombre: string; valoracion: string | null; observaciones: string | null }[];
  archivoUrl: string | null;
  // Si el momento ya existe en SEPA (agendado o registrado). Cuando no existe —porque la reunión
  // se hizo por fuera del sistema—, el aprendiz registra la fecha real al enviar el formato.
  existe: boolean;
  // Campos del formato que siguen vacíos, para avisarle al aprendiz antes de enviar.
  faltantes: string[];
};

const TITULOS: Record<1 | 2 | 3, string> = {
  1: "Momento N° 1 — Planeación de la etapa productiva",
  2: "Momento N° 2 — Seguimiento de la etapa productiva",
  3: "Momento N° 3 — Evaluación de la etapa productiva",
};

export async function construirFormato(
  userId: string,
  momento: 1 | 2 | 3,
): Promise<FormatoMomento | null> {
  const a = await cargarAprendiz(userId);
  if (!a) return null;

  const encabezado = encabezadoFormato(a);

  const [concertacion, evaluacion] = await Promise.all([
    momento === 1
      ? prisma.concertacionFuncion.findUnique({
          where: { userId },
          select: {
            fecha: true,
            horaInicio: true,
            horaFin: true,
            competenciasDesarrollar: true,
            resultadosAprendizaje: true,
            actividadesDesarrollar: true,
            evidenciasAprendizaje: true,
            observacionesAdicionales: true,
            arlFechaAfiliacion: true,
            arlNumeroPoliza: true,
            horario: true,
            enlaceGrabacion: true,
            archivoUrl: true,
          },
        })
      : null,
    momento === 1
      ? null
      : prisma.evaluacion.findFirst({
          where: { userId, numero: momento, esExtraordinario: false },
          select: {
            fecha: true,
            modalidad: true,
            enlaceGrabacion: true,
            numeroVisitas: true,
            retroalimentacionAprendiz: true,
            retroalimentacionInstructor: true,
            retroalimentacionCoformador: true,
            juicioFinal: true,
            archivoUrl: true,
            variables: { select: { variable: true, categoria: true, valoracion: true, observaciones: true } },
          },
        }),
  ]);

  const detalle: CampoFormato[] = [
    { etiqueta: "Fecha de inicio de la etapa productiva", valor: dia(a.fechaInicioEtapaProductiva) },
  ];
  const textos: FormatoMomento["textos"] = [];

  if (momento === 1) {
    detalle.push(
      { etiqueta: "Fecha de fin de la etapa productiva", valor: dia(a.fechaFinEtapaProductiva) },
      { etiqueta: "Fecha de afiliación a la ARL", valor: dia(concertacion?.arlFechaAfiliacion ?? null) },
      { etiqueta: "Número de póliza ARL (si aplica)", valor: limpio(concertacion?.arlNumeroPoliza) },
      { etiqueta: "Horario", valor: limpio(concertacion?.horario) },
      { etiqueta: "Fecha del momento", valor: dia(concertacion?.fecha ?? null) },
      { etiqueta: "Enlace de grabación", valor: limpio(concertacion?.enlaceGrabacion) },
    );
    textos.push(
      { titulo: "Competencias a desarrollar", cuerpo: limpio(concertacion?.competenciasDesarrollar) },
      { titulo: "Resultados de aprendizaje", cuerpo: limpio(concertacion?.resultadosAprendizaje) },
      { titulo: "Actividades a desarrollar", cuerpo: limpio(concertacion?.actividadesDesarrollar) },
      { titulo: "Evidencias de aprendizaje", cuerpo: limpio(concertacion?.evidenciasAprendizaje) },
      { titulo: "Observaciones adicionales", cuerpo: limpio(concertacion?.observacionesAdicionales) },
    );
  } else {
    detalle.push(
      {
        etiqueta: momento === 2 ? "Fecha del momento de seguimiento" : "Fecha de fin de la ejecución de la etapa productiva",
        valor: dia(momento === 2 ? (evaluacion?.fecha ?? null) : a.fechaFinEtapaProductiva),
      },
      ...(momento === 3
        ? [
            { etiqueta: "Fecha del momento de evaluación", valor: dia(evaluacion?.fecha ?? null) },
            {
              etiqueta: "Número de visitas realizadas en toda la etapa productiva",
              valor: evaluacion?.numeroVisitas != null ? String(evaluacion.numeroVisitas) : null,
            },
          ]
        : []),
      {
        etiqueta: momento === 2 ? "Modalidad del seguimiento" : "La evaluación se realizó en forma",
        valor: evaluacion?.modalidad
          ? modalidadEjecucionEPLabel[evaluacion.modalidad as ModalidadEjecucionEPValue]
          : null,
      },
      { etiqueta: "Enlace de grabación", valor: limpio(evaluacion?.enlaceGrabacion) },
      ...(momento === 3
        ? [{ etiqueta: "Juicio de evaluación de la etapa productiva", valor: evaluacion?.juicioFinal === "APROBADO" ? "Aprobado" : evaluacion?.juicioFinal === "NO_APROBADO" ? "No aprobado" : null }]
        : []),
    );
    textos.push(
      {
        titulo: momento === 2 ? "Observaciones del aprendiz" : "Retroalimentación del aprendiz",
        cuerpo: limpio(evaluacion?.retroalimentacionAprendiz),
      },
      {
        titulo: momento === 2 ? "Observaciones del instructor de seguimiento" : "Retroalimentación del instructor de seguimiento",
        cuerpo: limpio(evaluacion?.retroalimentacionInstructor),
      },
      {
        titulo: momento === 2 ? "Observaciones del responsable del ente co-formador" : "Retroalimentación del ente co-formador",
        cuerpo: limpio(evaluacion?.retroalimentacionCoformador),
      },
    );
  }

  const faltantes = [
    ...encabezado.flatMap((b) => b.campos.filter((c) => !c.valor).map((c) => `${b.titulo}: ${c.etiqueta}`)),
    ...detalle.filter((c) => !c.valor).map((c) => c.etiqueta),
    ...textos.filter((t) => !t.cuerpo).map((t) => t.titulo),
  ];

  return {
    momento,
    titulo: TITULOS[momento],
    encabezado,
    detalle,
    textos,
    variables: (evaluacion?.variables ?? []).map((v) => ({
      categoria: v.categoria as "TECNICO" | "ACTITUDINAL",
      nombre: v.variable,
      valoracion: v.valoracion,
      observaciones: v.observaciones,
    })),
    archivoUrl: momento === 1 ? (concertacion?.archivoUrl ?? null) : (evaluacion?.archivoUrl ?? null),
    existe: momento === 1 ? concertacion !== null : evaluacion !== null,
    faltantes,
  };
}
