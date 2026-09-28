"use client";

import { useEffect, useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";
import { FileUploadField } from "@/components/file-upload-field";
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

type Campo = { etiqueta: string; valor: string | null };
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
  "Información general::Regional": "regional",
  "Información general::Centro de formación": "centroFormacion",
  "Información general::Estrategia formativa": "estrategiaFormativa",
  "Datos del aprendiz::Correo electrónico institucional": "correoInstitucional",
  "Ente co-formador::NIT": "nitEmpresa",
  [`${BLOQUE_DISCAPACIDAD}::Nombre de quien asiste al aprendiz`]: "asistenciaNombre",
  [`${BLOQUE_DISCAPACIDAD}::Tipo de asistencia`]: "asistenciaTipo",
  [`${BLOQUE_DISCAPACIDAD}::Contacto telefónico`]: "asistenciaContacto",
};

const hoyEnColombia = fechaEnColombia(new Date());

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

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

function Fila({ etiqueta, valor }: Campo) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-zinc-100 py-1.5 last:border-0 dark:border-zinc-800 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500 sm:w-64">
        {etiqueta}
      </dt>
      <dd className="text-sm text-zinc-800 dark:text-zinc-200">{valor ? valor : <Vacio />}</dd>
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
      return clave ? { ...c, valor: datos[clave].trim() || null } : c;
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

  const detallePrevia: Campo[] =
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
      : formato.detalle;

  const textosPrevia = formato.textos.map((t) => {
    if (momento === 1) {
      const mapa: Record<string, string> = {
        "Competencias a desarrollar": plan.competenciasDesarrollar,
        "Resultados de aprendizaje": plan.resultadosAprendizaje,
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

  async function enviar() {
    setEnviando(true);
    setError(null);
    const cuandoSeHizo = formato?.existe
      ? {}
      : { fechaRealizado: realizado.fecha, horaInicio: realizado.horaInicio, horaFin: realizado.horaFin };
    const cuerpo =
      momento === 1
        ? { momento: 1 as const, ...plan, ...cuandoSeHizo, archivoUrl }
        : { momento, retroalimentacionAprendiz: retroalimentacion, ...cuandoSeHizo, archivoUrl };

    const res = await fetch("/api/etapa-productiva/formato", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datos, momento: cuerpo }),
    });
    const data = await res.json().catch(() => ({}));
    setEnviando(false);
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : (data.error?.fechaRealizado?.[0] ?? data.error?._root?.[0] ?? "No se pudo enviar el formato."),
      );
      return;
    }
    setFormato(data.formato);
    setEnviado(true);
    setVista("cerrado");
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
        <p className="mt-2 rounded-md bg-sena-claro px-3 py-2 text-sm text-azul dark:bg-emerald-900/20 dark:text-emerald-400">
          Formato enviado. Tu instructor lo verá con el resto de la evidencia del momento.
        </p>
      )}

      {vista === "editar" && (
        <div className="mt-4 flex flex-col gap-4">
          <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Datos que el formato pide y el sistema no tiene
            </summary>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Los escribes una sola vez y sirven para los tres momentos. Lo que no sepas, déjalo
              vacío: el formato saldrá con ese campo en blanco.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["regional", "Regional"],
                  ["centroFormacion", "Centro de formación"],
                  ["estrategiaFormativa", "Estrategia formativa"],
                  ["correoInstitucional", "Correo electrónico institucional"],
                  ["nitEmpresa", "NIT de la empresa"],
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
              {(
                [
                  ["competenciasDesarrollar", "Competencias a desarrollar"],
                  ["resultadosAprendizaje", "Resultados de aprendizaje"],
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

          <FileUploadField
            label="Formato GFPI-F-023 firmado (PDF)"
            pathPrefix={`gfpi023-momento-${momento}`}
            value={archivoUrl}
            onChange={setArchivoUrl}
            onUploadingChange={setSubiendo}
          />

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
                    <Fila key={c.etiqueta} etiqueta={c.etiqueta} valor={c.valor} />
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
                  <Fila key={c.etiqueta} etiqueta={c.etiqueta} valor={c.valor} />
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
              Quedan {enBlanco.length} campos en blanco: {enBlanco.slice(0, 6).join(", ")}
              {enBlanco.length > 6 ? "…" : ""}. Puedes enviarlo así; el formato saldrá con esos
              espacios vacíos.
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
