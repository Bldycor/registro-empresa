"use client";

import { useEffect, useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";
import { FileUploadField } from "@/components/file-upload-field";
import {
  agruparCompetencias,
  filasDesdeDocumento,
  filasDesdeTexto,
  textoDesdeFilas,
  type CompetenciaCatalogo,
  type FilaPlan,
} from "@/lib/competencia-catalogo";
import { fechaEnColombia } from "@/lib/plazos-institucionales";

// Formato GFPI-F-023 del aprendiz, momento por momento (requisito del 28 sep 2026).
//
// El aprendiz ve el formato ya diligenciado con lo que SEPA sabe de él —ficha, sus datos, su
// instructor, su empresa, las fechas de la etapa productiva— completa lo que falta, lo revisa en
// la vista previa y recién entonces lo envía junto con el PDF firmado.
//
// Lo que el sistema no sabe se muestra **en blanco** y se señala como pendiente: nunca se rellena
// con un valor de ejemplo. Las 13 variables de la rúbrica (Factores Técnicos y Actitudinales) las
// valora solo el instructor; acá se muestran como quedaron, en solo lectura.

type Campo = { etiqueta: string; valor: string | null; delDocumento?: boolean };
type Bloque = { titulo: string; campos: Campo[] };

type Formato = {
  momento: 1 | 2 | 3;
  titulo: string;
  encabezado: Bloque[];
  detalle: Campo[];
  textos: { titulo: string; cuerpo: string | null }[];
  variables: { categoria: "TECNICO" | "ACTITUDINAL"; nombre: string; valoracion: string | null; observaciones: string | null }[];
  archivoUrl: string | null;
  existe: boolean;
  faltantes: string[];
};

type Datos = {
  regional: string;
  centroFormacion: string;
  estrategiaFormativa: string;
  correoInstitucional: string;
  nitEmpresa: string;
  asistenciaNombre: string;
  asistenciaTipo: string;
  asistenciaContacto: string;
};

const DATOS_VACIOS: Datos = {
  regional: "",
  centroFormacion: "",
  estrategiaFormativa: "",
  correoInstitucional: "",
  nitEmpresa: "",
  asistenciaNombre: "",
  asistenciaTipo: "",
  asistenciaContacto: "",
};

// Qué casilla de la vista previa alimenta cada dato que escribe el aprendiz —por bloque, porque
// hay etiquetas que se repiten (varios «Contacto telefónico»)—. Así la previa muestra lo que acaba
// de escribir, sin tener que guardarlo antes.
const BLOQUE_DISCAPACIDAD = "Persona en situación de discapacidad (si aplica)";

const CAMPO_DE_DATO: Record<string, keyof Datos> = {
  "Datos del aprendiz::Correo electrónico institucional": "correoInstitucional",
  "Ente co-formador::NIT": "nitEmpresa",
  [`${BLOQUE_DISCAPACIDAD}::Nombre de quien asiste al aprendiz`]: "asistenciaNombre",
  [`${BLOQUE_DISCAPACIDAD}::Tipo de asistencia`]: "asistenciaTipo",
  [`${BLOQUE_DISCAPACIDAD}::Contacto telefónico`]: "asistenciaContacto",
};

const hoyEnColombia = fechaEnColombia(new Date());

// Qué casilla de la previa llena cada dato leído del PDF, cuando el sistema no lo sabe y el
// aprendiz no lo escribió.
const CAMPO_DEL_DOCUMENTO: Record<string, string> = {
  "Información general::Regional": "regional",
  "Información general::Centro de formación": "centroFormacion",
  "Información general::Estrategia formativa": "estrategiaFormativa",
  "Información general::Modalidad de formación": "modalidadFormacion",
  "Datos del aprendiz::Tipo de documento": "tipoDocumento",
  "Datos del aprendiz::Correo electrónico institucional": "correoInstitucional",
  "Datos del aprendiz::Fecha de registro en SofiaPlus": "registroSofiaPlus",
  "Ente co-formador::NIT": "nitEmpresa",
};

const DETALLE_DEL_DOCUMENTO: Record<string, string> = {
  "Enlace de grabación": "enlaceGrabacion",
  "Modalidad del seguimiento": "modalidadMomento",
  "La evaluación se realizó en forma": "modalidadMomento",
  "Fecha del momento de seguimiento": "fechaMomento",
  "Número de visitas realizadas en toda la etapa productiva": "numeroVisitas",
};

// Lo que el documento trae y no tiene casilla para escribir: son datos institucionales, no del
// aprendiz. Se muestran igual en el formulario, para que vea todo lo que se tomó del PDF.
const SOLO_LECTURA: [string, string][] = [
  ["regional", "Regional"],
  ["centroFormacion", "Centro de formación"],
  ["estrategiaFormativa", "Estrategia formativa"],
  ["modalidadFormacion", "Modalidad de formación"],
  ["tipoDocumento", "Tipo de documento"],
  ["registroSofiaPlus", "Fecha de registro en SofiaPlus"],
  ["enlaceGrabacion", "Enlace de grabación"],
  ["fechaMomento", "Fecha del momento"],
  ["modalidadMomento", "Modalidad del momento"],
  ["numeroVisitas", "Visitas realizadas"],
];

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// Casilla dentro de la vista previa: resaltada mientras siga vacía.
const casillaPrevia = (vacia: boolean) =>
  `w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:border-sena sm:max-w-md dark:bg-zinc-900 ${
    vacia ? "border-amber-400 bg-amber-50/60 dark:border-amber-600 dark:bg-amber-950/20" : "border-zinc-300 bg-white dark:border-zinc-700"
  }`;

type Modalidad = "" | "PRESENCIAL" | "VIRTUAL";
const MODALIDAD_LABEL: Record<Exclude<Modalidad, "">, string> = { PRESENCIAL: "Presencial", VIRTUAL: "Virtual" };
const ETIQUETA_ENLACE = "Enlace de grabación";
const ETIQUETAS_MODALIDAD = ["Modalidad del seguimiento", "La evaluación se realizó en forma"];
// La fecha de la reunión de cada momento (en el 3, «Fecha de fin de la ejecución» es otra cosa).
const ETIQUETAS_FECHA = ["Fecha del momento de seguimiento", "Fecha del momento de evaluación"];

function modalidadDeTexto(texto: string | null | undefined): Modalidad {
  const t = (texto ?? "").toLowerCase();
  if (/presencial/.test(t)) return "PRESENCIAL";
  if (/virtual|remot|teams|meet|zoom/.test(t)) return "VIRTUAL";
  return "";
}

function aDiaMesAnio(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

const VARIABLE_LABEL: Record<string, string> = {
  APLICACION_CONOCIMIENTO: "Aplicación de conocimiento",
  MEJORA_CONTINUA: "Mejora continua",
  FORTALECIMIENTO_OCUPACIONAL: "Fortalecimiento ocupacional",
  OPORTUNIDAD_CALIDAD: "Oportunidad y calidad",
  RESPONSABILIDAD_AMBIENTAL: "Responsabilidad ambiental",
  ADMINISTRACION_RECURSOS: "Administración de recursos",
  SEGURIDAD_SALUD_TRABAJO: "Seguridad y salud en el trabajo",
  DOCUMENTACION_ETAPA_PRODUCTIVA: "Documentación etapa productiva",
  RELACIONES_INTERPERSONALES: "Relaciones interpersonales",
  TRABAJO_EQUIPO: "Trabajo en equipo",
  SOLUCION_PROBLEMAS: "Solución de problemas",
  CUMPLIMIENTO: "Cumplimiento",
  ORGANIZACION: "Organización",
};

function Vacio() {
  return <span className="text-zinc-400 dark:text-zinc-500">(sin diligenciar)</span>;
}

// `editor`: la casilla para escribir el dato aquí mismo, en la vista previa, cuando el sistema no
// lo tiene y el PDF no se pudo leer (pedido de Coordinación, 4 oct 2026).
function Fila({ etiqueta, valor, delDocumento, editor }: Campo & { editor?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-zinc-100 py-1.5 last:border-0 dark:border-zinc-800 sm:flex-row sm:items-center sm:gap-3">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500 sm:w-64">
        {etiqueta}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-zinc-800 dark:text-zinc-200">
        {editor ?? (valor ? valor : <Vacio />)}
        {valor && delDocumento && (
          <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            leído del PDF
          </span>
        )}
      </dd>
    </div>
  );
}

function TablaVariables({
  titulo,
  filas,
}: {
  titulo: string;
  filas: Formato["variables"];
}) {
  if (filas.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {titulo}
      </p>
      <ul className="flex flex-col gap-1">
        {filas.map((v) => (
          <li key={v.nombre} className="flex flex-wrap items-baseline gap-2 text-sm">
            <span className="text-zinc-800 dark:text-zinc-200">
              {VARIABLE_LABEL[v.nombre] ?? v.nombre}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                v.valoracion === "SATISFACTORIO"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : v.valoracion === "POR_MEJORAR"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {v.valoracion === "SATISFACTORIO"
                ? "Satisfactorio"
                : v.valoracion === "POR_MEJORAR"
                  ? "Por mejorar"
                  : "Sin valorar"}
            </span>
            {v.observaciones && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{v.observaciones}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FormatoEP({ momento }: { momento: 1 | 2 | 3 }) {
  const [formato, setFormato] = useState<Formato | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<"cerrado" | "editar" | "previa">("cerrado");
  const [datos, setDatos] = useState<Datos>(DATOS_VACIOS);
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [lectura, setLectura] = useState<string | null>(null);
  // Lo leído del PDF que no se edita en el formulario (modalidad, tipo de documento, SofiaPlus…):
  // se muestra en la vista previa, marcado, para que el aprendiz lo verifique.
  const [delDocumento, setDelDocumento] = useState<Record<string, string>>({});
  // Catálogo de competencias y resultados del programa de la ficha (solo Momento 1). `null`
  // mientras carga; vacío si el programa todavía no tiene catálogo, y ahí se escribe a mano.
  const [catalogo, setCatalogo] = useState<CompetenciaCatalogo[] | null>(null);
  // Filas recién agregadas que todavía no tienen competencia elegida (no caben en el texto).
  const [filasVacias, setFilasVacias] = useState(0);
  const [leyendo, setLeyendo] = useState(false);

  // Campos propios del momento.
  const [plan, setPlan] = useState({
    competenciasDesarrollar: "",
    resultadosAprendizaje: "",
    actividadesDesarrollar: "",
    evidenciasAprendizaje: "",
    observacionesAdicionales: "",
    arlFechaAfiliacion: "",
    arlNumeroPoliza: "",
    horario: "",
  });
  const [retroalimentacion, setRetroalimentacion] = useState("");
  // Solo cuando el momento no está en SEPA porque se hizo por fuera.
  const [realizado, setRealizado] = useState({ fecha: "", horaInicio: "", horaFin: "" });
  // Datos de la reunión que el PDF suele traer; si no se pudo leer, el aprendiz los escribe.
  const [manual, setManual] = useState<{ enlaceGrabacion: string; modalidad: Modalidad }>({
    enlaceGrabacion: "",
    modalidad: "",
  });

  // Se recarga al abrirlo, no solo al montar: los datos generales son los mismos para los tres
  // momentos, así que si el aprendiz acaba de escribirlos en otro momento, aquí ya se ven.
  function cargar() {
    fetch(`/api/etapa-productiva/formato?momento=${momento}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.formato) return;
        setFormato(data.formato);
        setArchivoUrl(data.formato.archivoUrl ?? null);
        if (data.datos) {
          setDatos({
            regional: data.datos.regional ?? "",
            centroFormacion: data.datos.centroFormacion ?? "",
            estrategiaFormativa: data.datos.estrategiaFormativa ?? "",
            correoInstitucional: data.datos.correoInstitucional ?? "",
            nitEmpresa: data.datos.nitEmpresa ?? "",
            asistenciaNombre: data.datos.asistenciaNombre ?? "",
            asistenciaTipo: data.datos.asistenciaTipo ?? "",
            asistenciaContacto: data.datos.asistenciaContacto ?? "",
          });
        }
        // Lo ya guardado del momento se precarga para no hacerle reescribir nada.
        const f: Formato = data.formato;
        const valorDe = (etiqueta: string) => f.detalle.find((c) => c.etiqueta === etiqueta)?.valor ?? "";
        setManual({
          enlaceGrabacion: valorDe(ETIQUETA_ENLACE),
          modalidad: modalidadDeTexto(ETIQUETAS_MODALIDAD.map(valorDe).find(Boolean)),
        });
        const textoDe = (titulo: string) => f.textos.find((t) => t.titulo === titulo)?.cuerpo ?? "";
        if (f.momento === 1) {
          setPlan({
            competenciasDesarrollar: textoDe("Competencias a desarrollar"),
            resultadosAprendizaje: textoDe("Resultados de aprendizaje"),
            actividadesDesarrollar: textoDe("Actividades a desarrollar"),
            evidenciasAprendizaje: textoDe("Evidencias de aprendizaje"),
            observacionesAdicionales: textoDe("Observaciones adicionales"),
            // La fecha vuelve como DD/MM/AAAA; el campo de fecha necesita AAAA-MM-DD.
            arlFechaAfiliacion: (() => {
              const v = valorDe("Fecha de afiliación a la ARL");
              const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
              return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
            })(),
            arlNumeroPoliza: valorDe("Número de póliza ARL (si aplica)"),
            horario: valorDe("Horario"),
          });
        } else {
          setRetroalimentacion(
            textoDe(f.momento === 2 ? "Observaciones del aprendiz" : "Retroalimentación del aprendiz"),
          );
        }
      })
      .catch(() => setError("No se pudo cargar el formato."));
  }

  useEffect(cargar, [momento]);

  useEffect(() => {
    if (momento !== 1) return;
    fetch("/api/etapa-productiva/competencias")
      .then((res) => res.json())
      .then((d) => setCatalogo(d.competencias ?? []))
      .catch(() => setCatalogo([]));
  }, [momento]);

  function abrir() {
    cargar();
    setVista("editar");
  }

  if (!formato) return null;

  // La previa toma lo que el aprendiz acaba de escribir, sin necesidad de guardarlo antes: solo
  // se sobrescriben las casillas que él mismo llena.
  const conDatosEscritos = (b: Bloque): Bloque => ({
    ...b,
    campos: b.campos.map((c) => {
      const clave = CAMPO_DE_DATO[`${b.titulo}::${c.etiqueta}`];
      // Lo que el aprendiz escribe manda sobre todo lo demás.
      if (clave && datos[clave].trim()) {
        return { ...c, valor: datos[clave].trim(), delDocumento: false };
      }
      // Si sigue vacío y el PDF lo traía, se muestra marcado.
      if (!c.valor) {
        const claveDoc = CAMPO_DEL_DOCUMENTO[`${b.titulo}::${c.etiqueta}`];
        const leido = claveDoc ? delDocumento[claveDoc] : undefined;
        if (leido) return { ...c, valor: leido, delDocumento: true };
      }
      return c;
    }),
  });

  const hayDiscapacidad =
    datos.asistenciaNombre.trim() || datos.asistenciaTipo.trim() || datos.asistenciaContacto.trim();

  const encabezadoPrevia: Bloque[] = [
    ...formato.encabezado.map(conDatosEscritos),
    // El bloque de discapacidad solo existe si hay algo que poner, y aparece apenas lo escribe.
    ...(hayDiscapacidad && !formato.encabezado.some((b) => b.titulo === BLOQUE_DISCAPACIDAD)
      ? [
          {
            titulo: BLOQUE_DISCAPACIDAD,
            campos: [
              { etiqueta: "Nombre de quien asiste al aprendiz", valor: datos.asistenciaNombre.trim() || null },
              { etiqueta: "Tipo de asistencia", valor: datos.asistenciaTipo.trim() || null },
              { etiqueta: "Contacto telefónico", valor: datos.asistenciaContacto.trim() || null },
            ],
          },
        ]
      : []),
  ];

  const conLeido = (c: Campo): Campo => {
    if (c.valor) return c;
    const claveDoc = DETALLE_DEL_DOCUMENTO[c.etiqueta];
    const leido = claveDoc ? delDocumento[claveDoc] : undefined;
    return leido ? { ...c, valor: leido, delDocumento: true } : c;
  };

  const detallePrevia: Campo[] = (
    momento === 1
      ? formato.detalle.map((c) => {
          if (c.etiqueta === "Fecha de afiliación a la ARL" && plan.arlFechaAfiliacion) {
            const [y, m, d] = plan.arlFechaAfiliacion.split("-");
            return { ...c, valor: `${d}/${m}/${y}` };
          }
          if (c.etiqueta === "Número de póliza ARL (si aplica)") {
            return { ...c, valor: plan.arlNumeroPoliza.trim() || null };
          }
          if (c.etiqueta === "Horario") return { ...c, valor: plan.horario.trim() || null };
          return c;
        })
      : formato.detalle
  )
    .map((c) => {
      // Lo escrito a mano manda sobre lo leído del PDF.
      if (c.etiqueta === ETIQUETA_ENLACE && manual.enlaceGrabacion.trim()) {
        return { ...c, valor: manual.enlaceGrabacion.trim(), delDocumento: false };
      }
      if (ETIQUETAS_MODALIDAD.includes(c.etiqueta) && manual.modalidad) {
        return { ...c, valor: MODALIDAD_LABEL[manual.modalidad], delDocumento: false };
      }
      if (ETIQUETAS_FECHA.includes(c.etiqueta) && !c.valor && realizado.fecha) {
        return { ...c, valor: aDiaMesAnio(realizado.fecha), delDocumento: false };
      }
      if (momento === 1 && c.etiqueta === "Fecha del momento" && !c.valor && realizado.fecha) {
        return { ...c, valor: aDiaMesAnio(realizado.fecha), delDocumento: false };
      }
      return c;
    })
    .map(conLeido);

  // Qué casillas de la previa se pueden escribir: las que el sistema no trae (según el formato
  // que devolvió el servidor, no lo que se va escribiendo, para que la casilla no desaparezca).
  const sinValorSistema = (etiqueta: string) => !formato.detalle.find((c) => c.etiqueta === etiqueta)?.valor;
  const correoSinValor = !formato.encabezado
    .find((b) => b.titulo === "Datos del aprendiz")
    ?.campos.find((c) => c.etiqueta === "Correo electrónico institucional")?.valor;

  function editorDetalle(c: Campo): React.ReactNode | undefined {
    if (c.etiqueta === ETIQUETA_ENLACE && sinValorSistema(c.etiqueta)) {
      return (
        <input
          type="url"
          aria-label={c.etiqueta}
          placeholder="Pega aquí el enlace de la grabación"
          value={manual.enlaceGrabacion}
          onChange={(e) => setManual((prev) => ({ ...prev, enlaceGrabacion: e.target.value }))}
          className={casillaPrevia(!manual.enlaceGrabacion.trim())}
        />
      );
    }
    if (momento !== 1 && ETIQUETAS_MODALIDAD.includes(c.etiqueta) && sinValorSistema(c.etiqueta)) {
      return (
        <select
          aria-label={c.etiqueta}
          value={manual.modalidad}
          onChange={(e) => setManual((prev) => ({ ...prev, modalidad: e.target.value as Modalidad }))}
          className={casillaPrevia(!manual.modalidad)}
        >
          <option value="">Selecciona</option>
          <option value="PRESENCIAL">Presencial</option>
          <option value="VIRTUAL">Virtual</option>
        </select>
      );
    }
    if (momento !== 1 && ETIQUETAS_FECHA.includes(c.etiqueta) && sinValorSistema(c.etiqueta)) {
      return (
        <input
          type="date"
          aria-label={c.etiqueta}
          max={hoyEnColombia}
          value={realizado.fecha}
          onChange={(e) => setRealizado((prev) => ({ ...prev, fecha: e.target.value }))}
          className={casillaPrevia(!realizado.fecha)}
        />
      );
    }
    return undefined;
  }

  function editorEncabezado(bloque: string, c: Campo): React.ReactNode | undefined {
    if (bloque === "Datos del aprendiz" && c.etiqueta === "Correo electrónico institucional" && correoSinValor) {
      return (
        <input
          type="email"
          aria-label={c.etiqueta}
          placeholder="tucorreo@soy.sena.edu.co"
          value={datos.correoInstitucional}
          onChange={(e) => setDatos((prev) => ({ ...prev, correoInstitucional: e.target.value }))}
          className={casillaPrevia(!datos.correoInstitucional.trim())}
        />
      );
    }
    return undefined;
  }

  const textosPrevia = formato.textos.map((t) => {
    if (momento === 1) {
      const planPrevia = conPlanDelCatalogo(plan);
      const mapa: Record<string, string> = {
        "Competencias a desarrollar": planPrevia.competenciasDesarrollar,
        "Resultados de aprendizaje": planPrevia.resultadosAprendizaje,
        "Actividades a desarrollar": plan.actividadesDesarrollar,
        "Evidencias de aprendizaje": plan.evidenciasAprendizaje,
        "Observaciones adicionales": plan.observacionesAdicionales,
      };
      if (t.titulo in mapa) return { ...t, cuerpo: mapa[t.titulo].trim() || null };
      return t;
    }
    if (t.titulo === "Observaciones del aprendiz" || t.titulo === "Retroalimentación del aprendiz") {
      return { ...t, cuerpo: retroalimentacion.trim() || null };
    }
    return t;
  });

  const enBlanco = [
    ...encabezadoPrevia.flatMap((b) => b.campos.filter((c) => !c.valor).map((c) => c.etiqueta)),
    ...detallePrevia.filter((c) => !c.valor).map((c) => c.etiqueta),
  ];
  const porEscribirAqui = [
    ...encabezadoPrevia.flatMap((b) =>
      b.campos.filter((c) => !c.valor && editorEncabezado(b.titulo, c)).map((c) => c.etiqueta),
    ),
    ...detallePrevia.filter((c) => !c.valor && editorDetalle(c)).map((c) => c.etiqueta),
  ];

  // Del D/M/AAAA del documento al AAAA-MM-DD que usan los campos de fecha.
  function aFechaCampo(valor: string): string {
    const m = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return "";
    const [, d, mes, anio] = m;
    const año = anio.length === 2 ? `20${anio}` : anio;
    return `${año}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Se llama apenas el aprendiz adjunta el PDF: lo leído entra en los campos que estén vacíos —lo
  // que él ya escribió no se toca— y el resto se guarda para mostrarlo en la vista previa.
  async function leerDelDocumento(url: string) {
    setLeyendo(true);
    setLectura(null);
    try {
      const res = await fetch("/api/etapa-productiva/formato/leer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivoUrl: url, momento }),
      });
      const d = await res.json();
      const leido: Record<string, string> = d.datos ?? {};

      if (d.sinTexto) {
        setLectura(
          "Ese archivo es una foto o un escaneo: no tiene texto, así que SEPA no pudo leer nada de él. Escribe los datos que falten en las casillas de abajo o directamente en la vista previa del formato; el archivo se envía igual.",
        );
        return;
      }
      if (!d.leidos) {
        setLectura(
          "No se reconoció ningún campo del formato en ese PDF. Escribe los datos que falten en las casillas de abajo o directamente en la vista previa; el documento se envía igual.",
        );
        return;
      }

      // Se arma el resultado aquí mismo (no desde el estado, que todavía no se actualizó) para
      // poder guardarlo de una vez.
      const datosFusionados: Datos = {
        ...datos,
        correoInstitucional: datos.correoInstitucional.trim() || (leido.correoInstitucional ?? ""),
        nitEmpresa: datos.nitEmpresa.trim() || (leido.nitEmpresa ?? ""),
      };
      const planFusionado = {
        ...plan,
        competenciasDesarrollar: plan.competenciasDesarrollar.trim() || (leido.competenciasDesarrollar ?? ""),
        resultadosAprendizaje: plan.resultadosAprendizaje.trim() || (leido.resultadosAprendizaje ?? ""),
        actividadesDesarrollar: plan.actividadesDesarrollar.trim() || (leido.actividadesDesarrollar ?? ""),
        evidenciasAprendizaje: plan.evidenciasAprendizaje.trim() || (leido.evidenciasAprendizaje ?? ""),
        observacionesAdicionales: plan.observacionesAdicionales.trim() || (leido.observacionesAdicionales ?? ""),
        arlNumeroPoliza: plan.arlNumeroPoliza.trim() || (leido.arlNumeroPoliza ?? ""),
        horario: plan.horario.trim() || (leido.horario ?? ""),
        arlFechaAfiliacion:
          plan.arlFechaAfiliacion || (leido.arlFechaAfiliacion ? aFechaCampo(leido.arlFechaAfiliacion) : ""),
      };

      // Con catálogo, competencias y resultados se eligen de la lista: lo leído se casa con ella
      // y solo entra lo que coincide. Lo demás se ve como texto del documento, sin guardarse.
      if (momento === 1 && catalogo && catalogo.length > 0 && !plan.resultadosAprendizaje.trim()) {
        const filas = filasDesdeDocumento(
          leido.competenciasDesarrollar ?? "",
          leido.resultadosAprendizaje ?? "",
          catalogo,
        );
        const texto = textoDesdeFilas(filas);
        planFusionado.competenciasDesarrollar = texto.competencias;
        planFusionado.resultadosAprendizaje = texto.resultados;
      }

      setDatos(datosFusionados);
      if (momento === 1) setPlan(planFusionado);
      setDelDocumento(leido);
      // Lo leído de la reunión entra en sus casillas, donde se puede corregir.
      setManual((prev) => ({
        enlaceGrabacion: prev.enlaceGrabacion.trim() || (leido.enlaceGrabacion ?? ""),
        modalidad: prev.modalidad || modalidadDeTexto(leido.modalidadMomento),
      }));
      if (!realizado.fecha && leido.fechaMomento) {
        const fecha = aFechaCampo(leido.fechaMomento);
        if (fecha && fecha <= hoyEnColombia) setRealizado((prev) => ({ ...prev, fecha }));
      }

      // Leer solo diligencia el formulario. Nada queda guardado hasta que el aprendiz revisa y
      // pulsa «Enviar a mi instructor» (así lo pidió Coordinación, 29 sep 2026).
      setLectura(
        `Del PDF se tomaron ${d.leidos} ${d.leidos === 1 ? "dato" : "datos"} y quedaron puestos en el formulario. Revísalos, corrige lo que haga falta y pulsa «Enviar a mi instructor» para guardarlos.`,
      );
    } catch {
      setLectura("No se pudo leer el documento. Puedes diligenciar los campos a mano y enviarlo igual.");
    } finally {
      setLeyendo(false);
    }
  }

  // Con catálogo, solo se guarda lo que coincide con él: el texto suelto se mostró como aviso y
  // no entra al formato (competencias y resultados se eligen de la lista).
  function conPlanDelCatalogo<T extends { competenciasDesarrollar: string; resultadosAprendizaje: string }>(p: T): T {
    if (momento !== 1 || !catalogo || catalogo.length === 0) return p;
    const { filas } = filasDesdeTexto(p.competenciasDesarrollar, p.resultadosAprendizaje, catalogo);
    const texto = textoDesdeFilas(filas);
    return { ...p, competenciasDesarrollar: texto.competencias, resultadosAprendizaje: texto.resultados };
  }

  // Guarda el formato. Lo usan el guardado automático al adjuntar y el botón de enviar.
  async function guardar(valores?: { datos: Datos; plan: typeof plan; archivoUrl: string | null }) {
    const datosAGuardar = valores?.datos ?? datos;
    const planAGuardar = conPlanDelCatalogo(valores?.plan ?? plan);
    const archivoAGuardar = valores ? valores.archivoUrl : archivoUrl;

    // El día de la reunión va cuando el momento no está en SEPA, o está pero sin día.
    const fechaFaltante = ETIQUETAS_FECHA.some((e) => formato?.detalle.some((c) => c.etiqueta === e && !c.valor));
    const cuandoSeHizo =
      formato?.existe && !fechaFaltante
        ? {}
        : { fechaRealizado: realizado.fecha, horaInicio: realizado.horaInicio, horaFin: realizado.horaFin };
    const cuerpo =
      momento === 1
        ? {
            momento: 1 as const,
            ...planAGuardar,
            ...cuandoSeHizo,
            enlaceGrabacion: manual.enlaceGrabacion,
            archivoUrl: archivoAGuardar,
          }
        : {
            momento,
            retroalimentacionAprendiz: retroalimentacion,
            ...cuandoSeHizo,
            enlaceGrabacion: manual.enlaceGrabacion,
            modalidad: manual.modalidad,
            archivoUrl: archivoAGuardar,
          };

    const res = await fetch("/api/etapa-productiva/formato", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datos: datosAGuardar, momento: cuerpo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false as const, data };
    }
    if (data.formato) setFormato(data.formato);
    return { ok: true as const, data };
  }

  async function enviar() {
    setEnviando(true);
    setError(null);

    const resultado = await guardar();
    setEnviando(false);
    if (!resultado.ok) {
      const data = resultado.data;
      setError(
        typeof data.error === "string"
          ? data.error
          : (data.error?.fechaRealizado?.[0] ?? data.error?._root?.[0] ?? "No se pudo enviar el formato."),
      );
      return;
    }
    const data = resultado.data;
    setEnviado(true);
    setVista("cerrado");
    if (data.lectura?.sinTexto) {
      setLectura("El PDF que adjuntaste no tiene texto (parece una foto o un escaneo), así que no se pudo leer nada de él.");
    } else if (data.lectura?.leidos > 0) {
      setLectura(
        `Del PDF se tomaron ${data.lectura.leidos} datos para completar el formato. Revísalos: mandan los que tú escribas.`,
      );
    } else {
      setLectura(null);
    }
  }

  const tecnicas = formato.variables.filter((v) => v.categoria === "TECNICO");
  const actitudinales = formato.variables.filter((v) => v.categoria === "ACTITUDINAL");

  return (
    <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Formato GFPI-F-023 · {formato.titulo.replace(/^Momento N° \d+ — /, "")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Diligencia lo que falta, revísalo y envíalo con el formato firmado en PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {formato.archivoUrl && (
            <a
              href={formato.archivoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 underline dark:text-emerald-500"
            >
              Ver el PDF enviado
            </a>
          )}
          <button
            type="button"
            onClick={() => (vista === "cerrado" ? abrir() : setVista("cerrado"))}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
          >
            {vista === "cerrado" ? "Diligenciar el formato" : "Cerrar"}
          </button>
        </div>
      </div>

      {enviado && vista === "cerrado" && (
        <>
          <p className="mt-2 rounded-md bg-sena-claro px-3 py-2 text-sm text-azul dark:bg-emerald-900/20 dark:text-emerald-400">
            Formato enviado. Tu instructor lo verá con el resto de la evidencia del momento.
          </p>
          {lectura && (
            <p className="mt-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
              {lectura}
            </p>
          )}
        </>
      )}

      {vista === "editar" && (
        <div className="mt-4 flex flex-col gap-4">
          <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Datos que el formato pide y el sistema no tiene
            </summary>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Los escribes una sola vez y sirven para los tres momentos. El NIT se toma de los datos
              de tu empresa, en «Mi perfil». Lo que no sepas, déjalo
              vacío: el formato saldrá con ese campo en blanco. La regional, el centro de formación
              y la estrategia formativa no se escriben acá: los configura la coordinación y entran
              solos en los tres momentos.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["correoInstitucional", "Correo electrónico institucional"],
                  ["asistenciaNombre", "Discapacidad: nombre de quien te asiste"],
                  ["asistenciaTipo", "Discapacidad: tipo de asistencia"],
                  ["asistenciaContacto", "Discapacidad: contacto telefónico"],
                ] as [keyof Datos, string][]
              ).map(([clave, etiqueta]) => (
                <label key={clave} className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {etiqueta}
                  <input
                    type="text"
                    value={datos[clave]}
                    onChange={(e) => setDatos((prev) => ({ ...prev, [clave]: e.target.value }))}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </details>

          {!formato.existe && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                Este momento todavía no está registrado en SEPA
              </p>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
                Si la reunión ya se hizo —por ejemplo, antes de empezar a usar la plataforma—,
                escribe el día en que ocurrió y quedará como constancia junto con tu formato. Si
                todavía no se ha hecho, agéndala arriba: así sale la citación para tu instructor y
                tu coformador.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DatePickerField
                  label="Día en que se hizo"
                  value={realizado.fecha}
                  onChange={(v) => setRealizado((prev) => ({ ...prev, fecha: v }))}
                  max={hoyEnColombia}
                />
                <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                  Hora de inicio
                  <input
                    type="time"
                    value={realizado.horaInicio}
                    onChange={(e) => setRealizado((prev) => ({ ...prev, horaInicio: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                  Hora de fin
                  <input
                    type="time"
                    value={realizado.horaFin}
                    onChange={(e) => setRealizado((prev) => ({ ...prev, horaFin: e.target.value }))}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          )}

          {momento === 1 ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DatePickerField
                  label="Fecha de afiliación a la ARL"
                  value={plan.arlFechaAfiliacion}
                  onChange={(v) => setPlan((prev) => ({ ...prev, arlFechaAfiliacion: v }))}
                />
                <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                  Número de póliza ARL (si aplica)
                  <input
                    type="text"
                    value={plan.arlNumeroPoliza}
                    onChange={(e) => setPlan((prev) => ({ ...prev, arlNumeroPoliza: e.target.value }))}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                Horario
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Diurno o nocturno, días de la semana y hora.
                </span>
                <input
                  type="text"
                  value={plan.horario}
                  onChange={(e) => setPlan((prev) => ({ ...prev, horario: e.target.value }))}
                  className={inputClass}
                />
              </label>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Plan de trabajo concertado. Escribe tu propuesta: tu instructor la revisa y la
                ajusta contigo en la reunión del Momento 1.
              </p>
              {/* Competencias y resultados SOLO del catálogo que cargó Coordinación: aquí no se
                  escriben a mano (decisión de Coordinación, 2 oct 2026). */}
              {catalogo && catalogo.length === 0 && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  El programa de tu ficha todavía no tiene competencias cargadas en SEPA. Pide a
                  Coordinación de Etapa Productiva que las cargue; mientras tanto puedes guardar el
                  resto del formato.
                </p>
              )}
              {catalogo && catalogo.length > 0 && (
                <SelectorPlan
                  catalogo={catalogo}
                  competencias={plan.competenciasDesarrollar}
                  resultados={plan.resultadosAprendizaje}
                  filasVacias={filasVacias}
                  onFilasVacias={setFilasVacias}
                  onCambio={(texto) =>
                    setPlan((prev) => ({
                      ...prev,
                      competenciasDesarrollar: texto.competencias,
                      resultadosAprendizaje: texto.resultados,
                    }))
                  }
                />
              )}
              {(
                [
                  ["actividadesDesarrollar", "Actividades a desarrollar"],
                  ["evidenciasAprendizaje", "Evidencias de aprendizaje"],
                  ["observacionesAdicionales", "Observaciones adicionales"],
                ] as [keyof typeof plan, string][]
              ).map(([clave, etiqueta]) => (
                <label key={clave} className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {etiqueta}
                  <textarea
                    value={plan[clave]}
                    onChange={(e) => setPlan((prev) => ({ ...prev, [clave]: e.target.value }))}
                    rows={3}
                    maxLength={4000}
                    className={inputClass}
                  />
                </label>
              ))}
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              {momento === 2 ? "Tus observaciones del seguimiento" : "Tu retroalimentación final"}
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Cómo va tu proceso de formación y cómo pusiste en práctica las competencias del
                programa.
              </span>
              <textarea
                value={retroalimentacion}
                onChange={(e) => setRetroalimentacion(e.target.value)}
                rows={4}
                maxLength={4000}
                className={inputClass}
              />
            </label>
          )}

          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Datos de la reunión</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              SEPA los toma del PDF firmado. Si adjuntas una foto o un escaneo, escríbelos aquí.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                Enlace de grabación
                <input
                  type="url"
                  value={manual.enlaceGrabacion}
                  onChange={(e) => setManual((prev) => ({ ...prev, enlaceGrabacion: e.target.value }))}
                  placeholder="https://…"
                  className={inputClass}
                />
              </label>
              {momento !== 1 && (
                <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {momento === 2 ? "Modalidad del seguimiento" : "La evaluación se realizó en forma"}
                  <select
                    value={manual.modalidad}
                    onChange={(e) => setManual((prev) => ({ ...prev, modalidad: e.target.value as Modalidad }))}
                    className={inputClass}
                  >
                    <option value="">Selecciona</option>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="VIRTUAL">Virtual</option>
                  </select>
                </label>
              )}
              {momento !== 1 && formato.existe && ETIQUETAS_FECHA.some((e) => sinValorSistema(e) && formato.detalle.some((c) => c.etiqueta === e)) && (
                <DatePickerField
                  label="Día en que se hizo la reunión"
                  value={realizado.fecha}
                  onChange={(v) => setRealizado((prev) => ({ ...prev, fecha: v }))}
                  max={hoyEnColombia}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Al adjuntar el formato firmado, SEPA lo lee y completa con él los campos que le falten
            —modalidad, tipo de documento, NIT, fecha de SofiaPlus, ARL, plan de trabajo—. Lo que tú
            escribas manda sobre lo que diga el PDF, y si el archivo es una foto o un escaneo no se
            puede leer nada.
          </p>

          <FileUploadField
            label="Formato GFPI-F-023 firmado (PDF)"
            pathPrefix={`gfpi023-momento-${momento}`}
            value={archivoUrl}
            onChange={(url) => {
              setArchivoUrl(url);
              if (url) leerDelDocumento(url);
            }}
            onUploadingChange={setSubiendo}
          />

          {leyendo && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Leyendo el documento…</p>
          )}
          {lectura && !enviado && (
            <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
              {lectura}
            </p>
          )}

          {SOLO_LECTURA.some(([clave]) => delDocumento[clave]) && (
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Tomado del documento
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Son datos de tu ficha y de tu proceso, no se escriben aquí. Si alguno está mal,
                avísale a tu instructor.
              </p>
              <dl className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-x-4 gap-y-2">
                {SOLO_LECTURA.filter(([clave]) => delDocumento[clave]).map(([clave, etiqueta]) => (
                  <div key={clave}>
                    <dt className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      {etiqueta}
                    </dt>
                    <dd className="break-words text-sm text-zinc-800 dark:text-zinc-200">
                      {delDocumento[clave]}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={() => setVista("previa")}
            className="w-fit rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro dark:bg-sena dark:text-white"
          >
            Ver el formato antes de enviar
          </button>
        </div>
      )}

      {vista === "previa" && (
        <div className="mt-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {formato.titulo}
            </p>

            {encabezadoPrevia.map((b) => (
              <div key={b.titulo} className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sena">
                  {b.titulo}
                </p>
                <dl>
                  {b.campos.map((c) => (
                    <Fila key={c.etiqueta} etiqueta={c.etiqueta} valor={c.valor} editor={editorEncabezado(b.titulo, c)} />
                  ))}
                </dl>
              </div>
            ))}

            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sena">
                Datos del momento
              </p>
              <dl>
                {detallePrevia.map((c) => (
                  <Fila key={c.etiqueta} etiqueta={c.etiqueta} valor={c.valor} editor={editorDetalle(c)} />
                ))}
              </dl>
            </div>

            {textosPrevia.map((t) => (
              <div key={t.titulo} className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {t.titulo}
                </p>
                <p className="whitespace-pre-line text-sm text-zinc-800 dark:text-zinc-200">
                  {t.cuerpo ? t.cuerpo : <Vacio />}
                </p>
              </div>
            ))}

            {momento !== 1 && (
              <>
                <TablaVariables titulo="Factores técnicos" filas={tecnicas} />
                <TablaVariables titulo="Factores actitudinales y comportamentales" filas={actitudinales} />
                {formato.variables.length === 0 && (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Las 13 variables las valora tu instructor después de la reunión.
                  </p>
                )}
              </>
            )}

            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              {archivoUrl ? "Se enviará con el PDF que adjuntaste." : "Todavía no adjuntaste el PDF firmado."}
            </p>
          </div>

          {enBlanco.length > 0 && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              Quedan {enBlanco.length} campo{enBlanco.length === 1 ? "" : "s"} en blanco: {enBlanco.slice(0, 6).join(", ")}
              {enBlanco.length > 6 ? "…" : ""}.{" "}
              {porEscribirAqui.length > 0 &&
                `${porEscribirAqui.length === enBlanco.length ? "Todos" : `${porEscribirAqui.length}`} se pueden escribir aquí mismo, en las casillas resaltadas del formato. `}
              Puedes enviarlo así; el formato saldrá con los espacios que queden vacíos.
            </p>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={enviando || subiendo}
              onClick={enviar}
              className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
            >
              {enviando ? "Enviando…" : "Enviar a mi instructor"}
            </button>
            <button
              type="button"
              onClick={() => setVista("editar")}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
            >
              Volver a editar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// Competencias y resultados de aprendizaje del plan de trabajo, elegidos del catálogo del programa
// de la ficha: cada fila es una competencia y, debajo, uno de sus resultados. Se guarda como texto
// —uno por línea—, el mismo formato que usa el instructor, así que al revisarlo le aparecen
// marcados.
function SelectorPlan({
  catalogo,
  competencias,
  resultados,
  filasVacias,
  onFilasVacias,
  onCambio,
}: {
  catalogo: CompetenciaCatalogo[];
  competencias: string;
  resultados: string;
  filasVacias: number;
  onFilasVacias: (n: number) => void;
  onCambio: (texto: { competencias: string; resultados: string }) => void;
}) {
  const { filas, sinCoincidencia } = filasDesdeTexto(competencias, resultados, catalogo);
  const grupos = agruparCompetencias(catalogo);
  const todas: (FilaPlan & { vacia?: boolean })[] = [
    ...filas,
    ...Array.from({ length: filasVacias }, () => ({ competencia: "", resultado: "", vacia: true })),
  ];

  function guardar(nuevas: FilaPlan[]) {
    onCambio(textoDesdeFilas(nuevas.filter((f) => f.competencia)));
  }

  function cambiar(i: number, fila: FilaPlan) {
    const esVacia = i >= filas.length;
    if (esVacia && fila.competencia) onFilasVacias(filasVacias - 1);
    const reales = filas.slice();
    if (esVacia) reales.push(fila);
    else reales[i] = fila;
    guardar(reales);
  }

  function quitar(i: number) {
    if (i >= filas.length) {
      onFilasVacias(filasVacias - 1);
      return;
    }
    guardar(filas.filter((_, j) => j !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Competencias y resultados de aprendizaje
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Elige del catálogo del programa de tu ficha la competencia y, debajo, el resultado de
        aprendizaje. Agrega una fila por cada resultado que vayas a desarrollar.
      </p>

      {todas.length === 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Todavía no has elegido ninguna.</p>
      )}

      {todas.map((fila, i) => {
        const resultadosDeLaCompetencia = grupos.find(([nombre]) => nombre === fila.competencia)?.[1] ?? [];
        return (
          <div
            key={`${fila.competencia}-${fila.resultado}-${i}`}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Fila {i + 1}</span>
              <button type="button" onClick={() => quitar(i)} className="text-xs text-red-600 underline">
                Quitar
              </button>
            </div>
            <select
              value={fila.competencia}
              onChange={(e) => cambiar(i, { competencia: e.target.value, resultado: "" })}
              className={inputClass}
            >
              <option value="">Elige la competencia</option>
              {grupos.map(([nombre]) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
            <select
              value={fila.resultado}
              onChange={(e) => cambiar(i, { competencia: fila.competencia, resultado: e.target.value })}
              disabled={!fila.competencia}
              className={inputClass}
            >
              <option value="">{fila.competencia ? "Elige el resultado de aprendizaje" : "Primero la competencia"}</option>
              {resultadosDeLaCompetencia.map((c) => (
                <option key={c.id} value={c.resultadoAprendizaje}>
                  {c.resultadoAprendizaje}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onFilasVacias(filasVacias + 1)}
        className="w-fit text-sm text-emerald-700 underline dark:text-emerald-500"
      >
        + Agregar competencia y resultado
      </button>

      {sinCoincidencia.length > 0 && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          <p className="font-medium">Texto que no coincide con el catálogo y no se guardará:</p>
          <ul className="mt-1 list-disc pl-4">
            {sinCoincidencia.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-1">Elige arriba las competencias y resultados equivalentes.</p>
        </div>
      )}
    </div>
  );
}
