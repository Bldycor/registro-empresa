"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/components/file-upload-field";
import { PlantillaEnlace, PLANTILLA_BITACORA } from "@/components/plantilla-enlace";
import { DatePickerField } from "@/components/date-picker-field";
import { NivelRiesgoARLValues, nivelRiesgoARLLabel } from "@/lib/validations";
import { agruparCompetencias, type CompetenciaCatalogo, competenciaDelCatalogo } from "@/lib/competencia-catalogo";

// Bitácora del aprendiz (GFPI-F-147), en tres pasos (decisión del usuario, 9 nov 2026):
//   1. Adjunta el PDF firmado.
//   2. SEPA lee el período, la ARL y las actividades, y las muestra para que las verifique.
//   3. Confirma que son las actividades que realizó en ese período y envía.
// Las actividades no se escriben ni se editan: salen del documento. Si algo está mal, el aprendiz
// corrige su archivo y lo vuelve a adjuntar. Antes, el formulario copiaba las actividades de la
// bitácora anterior y el instructor terminaba rechazándolas por incoherencia. El servidor vuelve a
// leer el PDF al guardar, así que lo enviado siempre coincide con el documento.

type ActividadLeida = {
  descripcion: string;
  // Texto de la competencia en el PDF; la del catálogo se calcula al mostrarla.
  competenciaLeida: string | null;
  evidenciaCumplimiento: string | null;
  observaciones: string | null;
};

type Lectura =
  | { estado: "sin-archivo" | "leyendo" | "foto" | "sin-texto" | "sin-actividades" | "error" }
  | {
      estado: "lista";
      actividades: ActividadLeida[];
      periodoDelPdf: boolean;
      arlDelPdf: boolean;
      // El «Bitácora N°» que trae el documento, si se leyó.
      numeroDelPdf: number | null;
    };

type Campos = {
  periodoDesde: string;
  periodoHasta: string;
  archivoUrl: string;
  arlAfiliado: string;
  arlNivelRiesgo: string;
  arlRiesgoCorresponde: string;
  arlTieneEPP: string;
};

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

// Los selectores de Sí/No usan "SI" y "NO" (antes la lectura del PDF ponía "true"/"false", que
// ningún selector reconocía, y al enviar la ARL leída quedaba en «No»).
function siNo(v: boolean | null | undefined): string {
  return v === true ? "SI" : v === false ? "NO" : "";
}

// Del D/M/AAAA del documento al AAAA-MM-DD que usan los campos de fecha.
function aFechaCampo(valor: string | null | undefined): string {
  const m = (valor ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return "";
  const [, d, mes, anio] = m;
  return `${anio.length === 2 ? `20${anio}` : anio}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function fechaLegible(valor: string): string {
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "?";
}

const AVISO: Record<Exclude<Lectura["estado"], "lista" | "sin-archivo" | "leyendo">, string> = {
  foto: "Adjuntaste una foto. SEPA solo lee la bitácora en PDF: exporta la plantilla GFPI-F-147 a PDF y adjúntala.",
  "sin-texto": "Ese PDF no tiene texto (parece un escaneo). Exporta la plantilla GFPI-F-147 a PDF desde Excel y adjúntala.",
  "sin-actividades":
    "SEPA no encontró la tabla de actividades en tu PDF. Revisa que sea la plantilla GFPI-F-147 con la tabla «Descripción de las actividades realizadas» diligenciada, y vuelve a adjuntarla.",
  error: "No se pudo leer el documento. Vuelve a adjuntarlo; si el problema sigue, avísale a tu instructor.",
};

export type BitacoraFormInitial = {
  periodoDesde: string | null;
  periodoHasta: string | null;
  archivoUrl: string | null;
  arlAfiliado: boolean | null;
  arlNivelRiesgo: string | null;
  arlRiesgoCorresponde: boolean | null;
  arlTieneEPP: boolean | null;
  actividades: {
    descripcion: string;
    competencias: string | null;
    evidenciaCumplimiento: string | null;
    observaciones: string | null;
  }[];
} | null;

// Datos de la bitácora anterior más reciente que ya se envió — se usan solo para prellenar la ARL
// de una bitácora nueva (suele repetirse mes a mes) cuando el PDF no la trae. Las actividades no se
// copian: son las de cada período (9 nov 2026).
export type BitacoraPrefillPrevio = {
  arlAfiliado: boolean | null;
  arlNivelRiesgo: string | null;
  arlRiesgoCorresponde: boolean | null;
  arlTieneEPP: boolean | null;
} | null;

export function BitacoraForm({
  numero,
  initial,
  periodoSugerido,
  prefillPrevio,
  onSaved,
  onCancel,
}: {
  numero: number;
  initial: BitacoraFormInitial;
  periodoSugerido?: { desde: string; hasta: string };
  prefillPrevio?: BitacoraPrefillPrevio;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const base = initial ?? prefillPrevio;
  const [form, setForm] = useState<Campos>({
    periodoDesde: initial?.periodoDesde ?? periodoSugerido?.desde ?? "",
    periodoHasta: initial?.periodoHasta ?? periodoSugerido?.hasta ?? "",
    archivoUrl: initial?.archivoUrl ?? "",
    arlAfiliado: siNo(base?.arlAfiliado),
    arlNivelRiesgo: base?.arlNivelRiesgo ?? "",
    arlRiesgoCorresponde: siNo(base?.arlRiesgoCorresponde),
    arlTieneEPP: siNo(base?.arlTieneEPP),
  });
  const [lectura, setLectura] = useState<Lectura>({ estado: initial?.archivoUrl ? "leyendo" : "sin-archivo" });
  const [confirmado, setConfirmado] = useState(false);
  // Competencia elegida de la lista para las actividades cuya competencia del PDF no está en el catálogo.
  const [elegidas, setElegidas] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [catalogo, setCatalogo] = useState<CompetenciaCatalogo[] | null>(null);
  // Solo cuenta la última lectura: si el aprendiz cambia de archivo a mitad, la anterior se ignora.
  const lecturaVigente = useRef(0);

  useEffect(() => {
    fetch("/api/etapa-productiva/competencias")
      .then((res) => res.json())
      .then((data) => setCatalogo(data.competencias ?? []))
      .catch(() => setCatalogo([]));
  }, []);

  // Pide la lectura del PDF sin guardar nada.
  async function pedirLectura(url: string) {
    const res = await fetch("/api/etapa-productiva/bitacoras/leer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivoUrl: url }),
    });
    return res.json();
  }

  // Aplica lo leído, si sigue siendo la última lectura pedida.
  function aplicarLectura(turno: number, d: {
    error?: boolean;
    esImagen?: boolean;
    sinTexto?: boolean;
    datos?: Record<string, string | boolean | null | undefined>;
    actividades?: { descripcion: string; competencias: string | null; evidenciaCumplimiento: string | null; observaciones: string | null }[];
  }) {
    if (turno !== lecturaVigente.current) return;
    if (d.error) return setLectura({ estado: "error" });
    if (d.esImagen) return setLectura({ estado: "foto" });
    if (d.sinTexto) return setLectura({ estado: "sin-texto" });
    const filas = d.actividades ?? [];
    if (filas.length === 0) return setLectura({ estado: "sin-actividades" });

    const leido = d.datos ?? {};
    const desde = aFechaCampo(leido.periodoDesde as string | undefined);
    const hasta = aFechaCampo(leido.periodoHasta as string | undefined);
    const arl = {
      arlAfiliado: siNo(leido.arlAfiliado as boolean | null | undefined),
      arlNivelRiesgo: (leido.arlNivelRiesgo as string | undefined) ?? "",
      arlRiesgoCorresponde: siNo(leido.arlRiesgoCorresponde as boolean | null | undefined),
      arlTieneEPP: siNo(leido.arlTieneEPP as boolean | null | undefined),
    };
    // Lo leído del PDF manda; lo que el PDF no trae conserva lo que ya había.
    setForm((prev) => ({
      ...prev,
      periodoDesde: desde || prev.periodoDesde,
      periodoHasta: hasta || prev.periodoHasta,
      arlAfiliado: arl.arlAfiliado || prev.arlAfiliado,
      arlNivelRiesgo: arl.arlNivelRiesgo || prev.arlNivelRiesgo,
      arlRiesgoCorresponde: arl.arlRiesgoCorresponde || prev.arlRiesgoCorresponde,
      arlTieneEPP: arl.arlTieneEPP || prev.arlTieneEPP,
    }));
    setElegidas({});
    setLectura({
      estado: "lista",
      periodoDelPdf: Boolean(desde || hasta),
      arlDelPdf: Object.values(arl).some(Boolean),
      numeroDelPdf: Number(leido.numero) || null,
      actividades: filas.map((a) => ({
        descripcion: a.descripcion,
        competenciaLeida: a.competencias,
        evidenciaCumplimiento: a.evidenciaCumplimiento,
        observaciones: a.observaciones,
      })),
    });
  }

  function leerDelDocumento(url: string) {
    const turno = ++lecturaVigente.current;
    setLectura({ estado: "leyendo" });
    setConfirmado(false);
    pedirLectura(url)
      .then((d) => aplicarLectura(turno, d))
      .catch(() => turno === lecturaVigente.current && setLectura({ estado: "error" }));
  }

  // Al corregir una bitácora ya enviada, su PDF se vuelve a leer para mostrar lo que va a quedar.
  const archivoInicial = initial?.archivoUrl;
  useEffect(() => {
    if (!archivoInicial) return;
    const turno = ++lecturaVigente.current;
    pedirLectura(archivoInicial)
      .then((d) => aplicarLectura(turno, d))
      .catch(() => turno === lecturaVigente.current && setLectura({ estado: "error" }));
    // Solo al abrir el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof Campos>(key: K, value: Campos[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Competencia de cada actividad: la del catálogo que coincide con la del PDF o, si ninguna
  // coincide, la que el aprendiz elige de la lista.
  const competenciaDe = (a: ActividadLeida, idx: number) =>
    (catalogo ? competenciaDelCatalogo(a.competenciaLeida, catalogo) : "") || elegidas[idx] || "";
  const coincide = (a: ActividadLeida) => Boolean(catalogo && competenciaDelCatalogo(a.competenciaLeida, catalogo));

  function cancelar() {
    // Anidado en el acordeón de bitácoras, «Cancelar» solo cierra esa fila; fuera de él, vuelve atrás.
    if (onCancel) onCancel();
    else router.back();
  }

  const lista = lectura.estado === "lista" ? lectura : null;
  const puedeEnviar = Boolean(lista) && confirmado && !loading && !subiendoArchivo;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lista || !confirmado) return;
    setErrors({});
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/etapa-productiva/bitacoras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero,
        periodoDesde: form.periodoDesde || null,
        periodoHasta: form.periodoHasta || null,
        archivoUrl: form.archivoUrl,
        arlAfiliado: form.arlAfiliado ? form.arlAfiliado === "SI" : null,
        arlNivelRiesgo: form.arlNivelRiesgo || null,
        arlRiesgoCorresponde: form.arlRiesgoCorresponde ? form.arlRiesgoCorresponde === "SI" : null,
        arlTieneEPP: form.arlTieneEPP ? form.arlTieneEPP === "SI" : null,
        // El servidor toma las actividades del PDF; de aquí solo usa la competencia elegida del
        // catálogo cuando la del documento no coincide con ninguna.
        actividades: lista.actividades.map((a, idx) => ({
          descripcion: a.descripcion,
          competencias: competenciaDe(a, idx) || null,
          evidenciaCumplimiento: a.evidenciaCumplimiento,
          observaciones: a.observaciones,
        })),
        confirmaActividades: true,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setErrors(data.error ?? {});
      return;
    }
    setSuccess(true);
    if (onSaved) onSaved();
    router.refresh();
  }

  const grupos = catalogo ? agruparCompetencias(catalogo) : [];

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-5">
        <Paso n={1} titulo="Adjunta tu bitácora en PDF">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Diligencia la plantilla GFPI-F-147, fírmala y adjúntala en PDF. SEPA leerá de ella el período, la ARL y
            las actividades.
          </p>
          <PlantillaEnlace plantilla={PLANTILLA_BITACORA} />
          <FileUploadField
            label="Bitácora firmada (PDF)"
            pathPrefix="bitacora-ep"
            value={form.archivoUrl || null}
            onChange={(url) => {
              update("archivoUrl", url);
              if (url) leerDelDocumento(url);
              else setLectura({ estado: "sin-archivo" });
            }}
            error={errors.archivoUrl?.[0]}
            required
            onUploadingChange={setSubiendoArchivo}
          />
          {lectura.estado === "leyendo" && (
            <p className="animate-pulse text-sm text-zinc-500 dark:text-zinc-400">Leyendo tu bitácora…</p>
          )}
          {lectura.estado in AVISO && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {AVISO[lectura.estado as keyof typeof AVISO]}
            </p>
          )}
        </Paso>

        {lista && (
          <Paso n={2} titulo="Verifica lo que SEPA leyó">
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Revisa las actividades que SEPA tomó de tu bitácora. Deben ser las que realizaste entre el{" "}
              <strong>{fechaLegible(form.periodoDesde)}</strong> y el <strong>{fechaLegible(form.periodoHasta)}</strong>.
              Si alguna no corresponde, corrige tu archivo y vuelve a adjuntarlo.
            </p>

            {lista.numeroDelPdf !== null && lista.numeroDelPdf !== numero && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                Tu archivo dice «Bitácora N° {lista.numeroDelPdf}» y lo estás adjuntando en la Bitácora {numero}. Revisa
                que sea el archivo de este período antes de enviarlo.
              </p>
            )}

            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DatePickerField
                  label="Período desde"
                  value={form.periodoDesde}
                  onChange={(v) => update("periodoDesde", v)}
                  error={errors.periodoDesde?.[0]}
                />
                <DatePickerField
                  label="Período hasta"
                  value={form.periodoHasta}
                  onChange={(v) => update("periodoHasta", v)}
                  error={errors.periodoHasta?.[0]}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {lista.periodoDelPdf
                  ? "Leído de tu bitácora."
                  : "Tu PDF no trae el período: SEPA puso el que te corresponde según tu fecha de inicio. Ajústalo si hace falta."}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h4 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Afiliación a ARL</h4>
              <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                {lista.arlDelPdf
                  ? "Leída de tu bitácora. Completa lo que falte."
                  : "Tu PDF no trae la ARL: complétala."}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SiNo label="¿Estás afiliado a la ARL?" value={form.arlAfiliado} onChange={(v) => update("arlAfiliado", v)} />
                <Field label="Nivel de riesgo">
                  <select value={form.arlNivelRiesgo} onChange={(e) => update("arlNivelRiesgo", e.target.value)} className={inputClass}>
                    <option value="">Sin definir</option>
                    {NivelRiesgoARLValues.map((v) => (
                      <option key={v} value={v}>
                        {nivelRiesgoARLLabel[v]}
                      </option>
                    ))}
                  </select>
                </Field>
                <SiNo
                  label="¿El nivel de riesgo corresponde a tu labor?"
                  value={form.arlRiesgoCorresponde}
                  onChange={(v) => update("arlRiesgoCorresponde", v)}
                />
                <SiNo label="¿La empresa te suministra los EPP?" value={form.arlTieneEPP} onChange={(v) => update("arlTieneEPP", v)} />
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Actividades de tu bitácora ({lista.actividades.length})
              </h4>
              <ol className="flex flex-col gap-2">
                {lista.actividades.map((a, idx) => (
                  <li key={idx} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                    <p className="text-zinc-900 dark:text-zinc-100">
                      <span className="font-semibold">{idx + 1}.</span> {a.descripcion}
                    </p>
                    <dl className="mt-1 flex flex-col gap-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <div>
                        <dt className="inline font-medium">Competencia: </dt>
                        <dd className="inline">
                          {coincide(a) ? (
                            competenciaDe(a, idx)
                          ) : grupos.length > 0 ? (
                            <span className="mt-1 flex flex-col gap-1">
                              <span className="text-amber-700 dark:text-amber-400">
                                {a.competenciaLeida
                                  ? `«${a.competenciaLeida}» no coincide con el catálogo de tu programa: elígela de la lista.`
                                  : "Tu bitácora no trae la competencia: elígela de la lista."}
                              </span>
                              <select
                                value={elegidas[idx] ?? ""}
                                onChange={(e) => setElegidas((prev) => ({ ...prev, [idx]: e.target.value }))}
                                className={inputClass}
                              >
                                <option value="">Selecciona</option>
                                {grupos.map(([nombre]) => (
                                  <option key={nombre} value={nombre}>
                                    {nombre}
                                  </option>
                                ))}
                              </select>
                            </span>
                          ) : (
                            (a.competenciaLeida ?? "—")
                          )}
                        </dd>
                      </div>
                      {a.evidenciaCumplimiento && (
                        <div>
                          <dt className="inline font-medium">Evidencia: </dt>
                          <dd className="inline">{a.evidenciaCumplimiento}</dd>
                        </div>
                      )}
                      {a.observaciones && (
                        <div>
                          <dt className="inline font-medium">Observaciones: </dt>
                          <dd className="inline">{a.observaciones}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ol>
            </div>
          </Paso>
        )}

        {lista && (
          <Paso n={3} titulo="Confirma y envía">
            <label className="flex items-start gap-2 rounded-md border border-zinc-200 p-3 text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => setConfirmado(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              Confirmo que estas son las actividades que realicé en el período de esta bitácora.
            </label>
            {errors.confirmaActividades && <p className="text-sm text-red-600">{errors.confirmaActividades[0]}</p>}
          </Paso>
        )}

        {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
        {success && (
          <p className="text-sm text-emerald-700 dark:text-emerald-500">
            Bitácora enviada — queda pendiente de aval del instructor.
          </p>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="submit"
            disabled={!puedeEnviar}
            title={!lista ? "Primero adjunta tu bitácora en PDF." : !confirmado ? "Confirma las actividades para enviar." : undefined}
            className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white dark:hover:bg-sena-oscuro"
          >
            {loading ? "Enviando…" : subiendoArchivo ? "Subiendo archivo…" : initial ? "Actualizar bitácora" : "Enviar bitácora"}
          </button>
          <button
            type="button"
            onClick={cancelar}
            disabled={loading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-azul text-xs text-white">{n}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function SiNo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Sin definir</option>
        <option value="SI">Sí</option>
        <option value="NO">No</option>
      </select>
    </Field>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
