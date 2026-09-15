import type { Expediente } from "@/lib/expediente";
import type { EstadoSeguimiento } from "@/lib/seguimiento-evidencias";
import { formatoMomento } from "@/lib/plazos-institucionales";
import {
  alternativaEtapaProductivaLabel,
  estadoAprendizLabel,
  juicioEtapaProductivaLabel,
  modalidadEjecucionEPLabel,
  motivoAplazamientoEPLabel,
  motivoInterrupcionEPLabel,
  solicitanteReunionLabel,
  subtipoAlternativaEtapaProductivaLabel,
  tipoSolicitudAlternativaLabel,
  valoracionVariableLabel,
} from "@/lib/validations";
import { variableLabel } from "@/lib/evaluacion-variables";
import { variablePlaneacionLabel } from "@/lib/concertacion-variables";
import { ImprimirBoton } from "@/components/imprimir-boton";

// Vista de solo lectura del expediente (ver `cargarExpediente`). Es la misma para el aprendiz,
// su instructor y Coordinación; al imprimir se oculta el menú y todo sale en claro.

type Persona = { nombres: string; apellidos: string } | null;

// Días de calendario (guardados a medianoche UTC) frente a momentos (fecha y hora reales): los
// primeros se muestran en UTC y los segundos en hora de Colombia.
function dia(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString("es-CO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }) : "—";
}
function momento(d: Date | null | undefined): string {
  return d ? formatoMomento(d) : "—";
}
function quien(p: Persona): string {
  return p ? `${p.nombres} ${p.apellidos}` : "";
}

const estadoEvidencia: Record<string, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Pendiente", clase: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400" },
  APROBADA: { texto: "Aprobada", clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" },
  RECHAZADA: { texto: "Rechazada", clase: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400" },
};

const estadoSeguimiento: Record<EstadoSeguimiento, { texto: string; clase: string }> = {
  completa: { texto: "Completa", clase: "border-emerald-300 text-emerald-800 dark:border-emerald-900 dark:text-emerald-400" },
  atrasada: { texto: "Atrasada", clase: "border-red-300 text-red-800 dark:border-red-900 dark:text-red-400" },
  proxima: { texto: "Próxima a vencer", clase: "border-amber-300 text-amber-800 dark:border-amber-900 dark:text-amber-400" },
  pendiente: { texto: "Pendiente", clase: "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400" },
};

function Estado({ estado, texto }: { estado: string; texto?: string }) {
  const e = estadoEvidencia[estado] ?? { texto: estado, clase: "bg-zinc-100 text-zinc-700" };
  return (
    <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium print:border print:border-zinc-400 print:bg-transparent print:text-black ${e.clase}`}>
      {texto ?? e.texto}
    </span>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 print:break-inside-avoid print:rounded-none print:border-zinc-300 print:p-3">
      <h2 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{etiqueta}</dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{children || "—"}</dd>
    </div>
  );
}

function Archivo({ url }: { url: string | null | undefined }) {
  if (!url) return <span className="text-zinc-400">—</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline dark:text-emerald-500">
      Ver archivo
    </a>
  );
}

function Aval({ fechaAval, avaladoPor }: { fechaAval: Date | null; avaladoPor: Persona }) {
  if (!fechaAval) return null;
  return (
    <span className="text-xs text-zinc-500 dark:text-zinc-400">
      Revisada el {momento(fechaAval)}
      {avaladoPor ? ` por ${quien(avaladoPor)}` : ""}
    </span>
  );
}

function Nota({ etiqueta, texto }: { etiqueta: string; texto: string | null | undefined }) {
  if (!texto) return null;
  return (
    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
      <strong>{etiqueta}:</strong> {texto}
    </p>
  );
}

const vacio = <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin registro todavía.</p>;

const th = "border-b border-zinc-200 px-2 py-1.5 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400";
const td = "border-b border-zinc-100 px-2 py-1.5 align-top text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-200";

function Tabla({ encabezados, children }: { encabezados: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr>
            {encabezados.map((e) => (
              <th key={e} className={th}>
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Nombre legible de la entrega de un aviso registrado en `AvisoPlazo`.
function entregaAviso(clave: string): string {
  if (clave === "concertacion") return "Concertación (Momento 1)";
  // Solo el primer ":" separa el tipo: la hora de una reunión ("reunion:<id>@10:00") lleva otro.
  const corte = clave.indexOf(":");
  const tipo = clave.slice(0, corte);
  const resto = clave.slice(corte + 1);
  if (tipo === "bitacora") return `Bitácora ${resto}`;
  if (tipo === "momento") return `Momento ${resto}`;
  if (tipo === "reunion") return `Reunión de las ${resto.split("@")[1] ?? ""}`;
  return clave;
}

const tipoAviso: Record<string, string> = {
  PROXIMO: "Próxima a vencer",
  VENCIDO: "Vencida",
  RECORDATORIO_REUNION: "Recordatorio de reunión",
};

export function ExpedienteAprendiz({ expediente: e, propio = false }: { expediente: Expediente; propio?: boolean }) {
  const instructor = e.ficha?.instructor;
  const empresa = e.companyProfile;
  const completas = e.checklist.filter((c) => c.estado === "completa").length;
  const atrasadas = e.checklist.filter((c) => c.estado === "atrasada").length;
  const estadoGeneral =
    completas === e.checklist.length ? "Completo" : atrasadas > 0 ? `Con ${atrasadas} atrasada${atrasadas === 1 ? "" : "s"}` : "Al día";
  const alternativaVigente = [...e.seleccionesAlternativa].reverse().find((s) => s.estado === "APROBADA");

  return (
    <div className="flex flex-col gap-4 print:gap-3 print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {propio ? "Tu expediente de Etapa Productiva" : "Expediente de Etapa Productiva"}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 [text-wrap:balance]">
            {e.nombres} {e.apellidos}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {e.tipoDocumento ?? "Documento"} {e.cedula} · Ficha {e.ficha?.codigo ?? "sin asignar"}
            {e.ficha?.programa ? ` · ${e.ficha.programa}` : ""}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Generado el {momento(new Date())}</p>
        </div>
        <ImprimirBoton />
      </div>

      <Seccion titulo="Resumen">
        <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato etiqueta="Estado del aprendiz">{estadoAprendizLabel[e.estado]}</Dato>
          <Dato etiqueta="Estado del plan">{estadoGeneral}</Dato>
          <Dato etiqueta="Inicio de la Etapa Productiva">{dia(e.fechaInicioEtapaProductiva)}</Dato>
          <Dato etiqueta="Fin de la Etapa Productiva">{dia(e.fechaFinEtapaProductiva)}</Dato>
          <Dato etiqueta="Alternativa vigente">
            {alternativaVigente ? alternativaEtapaProductivaLabel[alternativaVigente.alternativa] : "—"}
          </Dato>
          <Dato etiqueta="Instructor de seguimiento">{instructor ? quien(instructor) : "Sin asignar"}</Dato>
          <Dato etiqueta="Bitácoras previstas">{e.totalBitacoras}</Dato>
          <Dato etiqueta="Días de tramos anteriores">{e.diasEjecutadosPrevios || "—"}</Dato>
          {e.plazoCulminacion && (
            <Dato etiqueta="Plazo máximo para culminar">{dia(e.plazoCulminacion)} (Acuerdo 007 de 2012)</Dato>
          )}
        </dl>
        {e.advertenciaPlazo && (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 print:bg-transparent print:text-black">
            {e.advertenciaPlazo}
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {e.checklist.map((c) => {
            const s = estadoSeguimiento[c.estado];
            return (
              <div key={c.clave} className={`rounded-lg border px-3 py-2 print:border-zinc-400 print:text-black ${s.clase}`}>
                <p className="text-sm font-medium">
                  {c.etiqueta} · {s.texto}
                </p>
                <p className="text-xs opacity-80">{c.detalle}</p>
              </div>
            );
          })}
        </div>
        {e.estado === "POR_CERTIFICAR" || e.estado === "CERTIFICADO" ? (
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            Marcado «Por certificar» el {momento(e.fechaPorCertificar)}
            {e.porCertificarPor ? ` por ${quien(e.porCertificarPor)}` : ""}.
          </p>
        ) : null}
      </Seccion>

      <Seccion titulo="Datos del aprendiz y la empresa">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Dato etiqueta="Correo">{e.email}</Dato>
          <Dato etiqueta="Celular">{e.celular}</Dato>
          <Dato etiqueta="Correo del instructor">{instructor?.email}</Dato>
          <Dato etiqueta="Empresa">{empresa?.empresaPatrocinadora}</Dato>
          <Dato etiqueta="Dirección de la empresa">{empresa?.direccionEmpresa}</Dato>
          <Dato etiqueta="Coformador">
            {empresa ? `${empresa.nombreCoformador} (${empresa.cargoCoformador})` : ""}
          </Dato>
          <Dato etiqueta="Correo del coformador">{empresa?.correoCoformador}</Dato>
          <Dato etiqueta="Celular del coformador">{empresa?.celularCoformador}</Dato>
        </dl>
      </Seccion>

      <Seccion titulo="Alternativa de Etapa Productiva (GFPI-F-165)">
        {e.seleccionesAlternativa.length === 0
          ? vacio
          : e.seleccionesAlternativa.map((s) => (
              <div key={s.id} className="border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {tipoSolicitudAlternativaLabel[s.tipoSolicitud]} · {alternativaEtapaProductivaLabel[s.alternativa]}
                    {s.subtipoAlternativa ? ` — ${subtipoAlternativaEtapaProductivaLabel[s.subtipoAlternativa]}` : ""}
                  </p>
                  <Estado estado={s.estado} />
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Solicitada el {dia(s.fechaSolicitud)} · Ejecución del {dia(s.fechaInicioEjecucion)} al {dia(s.fechaFinEjecucion)} ·{" "}
                  <Archivo url={s.archivoUrl} />
                </p>
                <Aval fechaAval={s.fechaAval} avaladoPor={s.avaladoPor} />
                <Nota etiqueta="Observaciones" texto={s.observacionesAval} />
                <Nota etiqueta="Constancia de requisitos pendientes" texto={s.requisitosOmitidos} />
                {s.estado === "APROBADA" && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Registro en SofiaPlus: {s.registroSofiaPlus ? dia(s.registroSofiaPlus) : "sin anotar"}
                  </p>
                )}
              </div>
            ))}
      </Seccion>

      <Seccion titulo="Formalización">
        {!e.formalizacionEtapaProductiva ? (
          vacio
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {e.formalizacionEtapaProductiva.tipoDocumento} · {dia(e.formalizacionEtapaProductiva.fecha)} ·{" "}
                <Archivo url={e.formalizacionEtapaProductiva.archivoUrl} />
              </p>
              <Estado estado={e.formalizacionEtapaProductiva.estado} />
            </div>
            <Aval fechaAval={e.formalizacionEtapaProductiva.fechaAval} avaladoPor={e.formalizacionEtapaProductiva.avaladoPor} />
            <Nota etiqueta="Observaciones" texto={e.formalizacionEtapaProductiva.observaciones} />
          </div>
        )}
      </Seccion>

      <Seccion titulo="Momento 1 · Concertación (GFPI-F-023)">
        {!e.concertacionFuncion ? (
          vacio
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                Reunión del {dia(e.concertacionFuncion.fecha)}, {e.concertacionFuncion.horaInicio}–{e.concertacionFuncion.horaFin}
              </p>
              <Estado estado={e.concertacionFuncion.estado} texto={e.concertacionFuncion.estado === "APROBADA" ? "Valorada" : undefined} />
            </div>
            <Aval fechaAval={e.concertacionFuncion.fechaAval} avaladoPor={e.concertacionFuncion.avaladoPor} />
            <Nota etiqueta="Competencias concertadas" texto={e.concertacionFuncion.competenciasDesarrollar?.split("\n").join("; ")} />
            {e.concertacionFuncion.variables.length > 0 && (
              <Tabla encabezados={["Planeación", "Valoración", "Observación"]}>
                {e.concertacionFuncion.variables.map((v) => (
                  <tr key={v.variable}>
                    <td className={td}>{variablePlaneacionLabel[v.variable]}</td>
                    <td className={td}>{v.valoracion ? valoracionVariableLabel[v.valoracion] : "Sin valorar"}</td>
                    <td className={td}>{v.observaciones ?? ""}</td>
                  </tr>
                ))}
              </Tabla>
            )}
            <Nota etiqueta="Observaciones" texto={e.concertacionFuncion.observaciones} />
          </div>
        )}
      </Seccion>

      <Seccion titulo={`Bitácoras (GFPI-F-147) · ${e.bitacoras.filter((b) => b.estado === "APROBADA").length} aprobadas de ${e.totalBitacoras}`}>
        {e.bitacoras.length === 0 ? (
          vacio
        ) : (
          <Tabla encabezados={["N.º", "Periodo", "Fecha límite", "Entregada", "Estado", "Observaciones", "Archivo"]}>
            {e.bitacoras.map((b) => (
              <tr key={b.numero}>
                <td className={td}>{b.numero}</td>
                <td className={td}>
                  {b.periodoDesde ? `${dia(b.periodoDesde)} – ${dia(b.periodoHasta)}` : "—"}
                </td>
                <td className={td}>{dia(b.fechaLimite)}</td>
                <td className={td}>{momento(b.fechaEntrega)}</td>
                <td className={td}>
                  <Estado estado={b.estado} />
                  <br />
                  <Aval fechaAval={b.fechaAval} avaladoPor={b.avaladoPor} />
                </td>
                <td className={td}>{b.observaciones ?? ""}</td>
                <td className={td}>
                  <Archivo url={b.archivoUrl} />
                </td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      {[2, 3].map((n) => {
        const m = e.momentos.find((x) => x.numero === n);
        return (
          <Seccion key={n} titulo={n === 2 ? "Momento 2 · Seguimiento (GFPI-F-023)" : "Momento 3 · Evaluación de cierre (GFPI-F-023)"}>
            {!m ? (
              vacio
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                    Reunión del {dia(m.fecha)}, {m.horaInicio}–{m.horaFin}
                    {m.modalidad ? ` · ${modalidadEjecucionEPLabel[m.modalidad]}` : ""}
                  </p>
                  <Estado estado={m.estado} texto={m.estado === "APROBADA" ? "Evaluada" : undefined} />
                </div>
                <Aval fechaAval={m.fechaAval} avaladoPor={m.avaladoPor} />
                {m.variables.length > 0 && (
                  <Tabla encabezados={["Variable", "Valoración", "Observación"]}>
                    {m.variables.map((v) => (
                      <tr key={v.variable}>
                        <td className={td}>{variableLabel[v.variable]}</td>
                        <td className={td}>{v.valoracion ? valoracionVariableLabel[v.valoracion] : "Sin valorar"}</td>
                        <td className={td}>{v.observaciones ?? ""}</td>
                      </tr>
                    ))}
                  </Tabla>
                )}
                {n === 3 && (
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Juicio final: {m.juicioFinal ? juicioEtapaProductivaLabel[m.juicioFinal] : "sin definir"}
                  </p>
                )}
                <Nota etiqueta="Retroalimentación del instructor" texto={m.retroalimentacionInstructor} />
                <Nota etiqueta="Retroalimentación del coformador" texto={m.retroalimentacionCoformador} />
                <Nota etiqueta="Comentario del aprendiz" texto={m.retroalimentacionAprendiz} />
              </div>
            )}
          </Seccion>
        );
      })}

      <Seccion titulo="Reuniones extraordinarias">
        {e.extraordinarias.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No se han pedido reuniones extraordinarias.</p>
        ) : (
          <Tabla encabezados={["Fecha", "Pedida por", "Motivo", "Estado", "Nota del instructor"]}>
            {e.extraordinarias.map((r) => (
              <tr key={r.id}>
                <td className={td}>
                  {dia(r.fecha)}, {r.horaInicio}–{r.horaFin}
                </td>
                <td className={td}>{r.solicitadaPor ? solicitanteReunionLabel[r.solicitadaPor] : "—"}</td>
                <td className={td}>{r.motivoExtraordinario ?? ""}</td>
                <td className={td}>
                  <Estado
                    estado={r.estado}
                    texto={r.estado === "PENDIENTE" ? "Por aprobar" : r.estado === "RECHAZADA" ? "No aprobada" : undefined}
                  />
                </td>
                <td className={td}>{r.observaciones ?? ""}</td>
              </tr>
            ))}
          </Tabla>
        )}
      </Seccion>

      <Seccion titulo="Certificación del empresario">
        {!e.certificacionEmpresario ? (
          vacio
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                {dia(e.certificacionEmpresario.fecha)} · <Archivo url={e.certificacionEmpresario.archivoUrl} />
              </p>
              <Estado estado={e.certificacionEmpresario.estado} />
            </div>
            <Aval fechaAval={e.certificacionEmpresario.fechaAval} avaladoPor={e.certificacionEmpresario.avaladoPor} />
            <Nota etiqueta="Observaciones" texto={e.certificacionEmpresario.observaciones} />
          </div>
        )}
      </Seccion>

      <Seccion titulo="Novedades">
        {e.interrupcionesEP.length === 0 && e.aplazamientosEP.length === 0 && !e.fechaDesercion ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin novedades registradas.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {e.interrupcionesEP.map((i, idx) => (
              <div key={`i${idx}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Interrupción · {alternativaEtapaProductivaLabel[i.alternativa]} · {motivoInterrupcionEPLabel[i.motivo]}
                  </p>
                  <Estado estado={i.estado} />
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Tramo del {dia(i.fechaInicioTramo)} al {dia(i.fechaInterrupcion)} · {i.diasEjecutados} días cumplidos ·{" "}
                  <Archivo url={i.certificadoUrl} />
                </p>
                <Aval fechaAval={i.fechaAval} avaladoPor={i.avaladoPor} />
                <Nota etiqueta="Detalle" texto={i.motivoDetalle} />
                <Nota etiqueta="Observaciones" texto={i.observacionesAval} />
              </div>
            ))}
            {e.aplazamientosEP.map((ap, idx) => (
              <div key={`a${idx}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Aplazamiento · {motivoAplazamientoEPLabel[ap.motivo]}
                  </p>
                  <Estado estado={ap.estado} />
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Suspendida el {dia(ap.fechaSuspension)} · reanudación prevista el {dia(ap.fechaReanudacionPrevista)}
                  {ap.fechaReanudacionReal ? ` · reanudada el ${dia(ap.fechaReanudacionReal)}` : ""} · {ap.diasEjecutados} días
                  cumplidos · <Archivo url={ap.soporteUrl} />
                </p>
                {ap.actaComite && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Acta del Comité {ap.actaComite} del {dia(ap.fechaActaComite)}
                  </p>
                )}
                <Aval fechaAval={ap.fechaAval} avaladoPor={ap.avaladoPor} />
                <Nota etiqueta="Detalle" texto={ap.motivoDetalle} />
                <Nota etiqueta="Observaciones" texto={ap.observacionesAval} />
              </div>
            ))}
            {e.fechaDesercion && (
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Deserción declarada el {momento(e.fechaDesercion)}
                  {e.declaradoDesertorPor ? ` por ${quien(e.declaradoDesertorPor)}` : ""}
                </p>
                <Nota etiqueta="Causa" texto={e.motivoDesercion} />
              </div>
            )}
          </div>
        )}
      </Seccion>

      <Seccion titulo="Avisos enviados por correo">
        {e.avisosPlazo.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No se le han enviado avisos.</p>
        ) : (
          <Tabla encabezados={["Enviado", "Aviso", "Entrega o reunión", "Fecha de referencia"]}>
            {e.avisosPlazo.map((av, idx) => {
              const sinCorreo = av.destinatarios.startsWith("(sin correo");
              return (
                <tr key={idx}>
                  <td className={td}>{sinCorreo ? "No se envió" : momento(av.enviadoEn)}</td>
                  <td className={td}>
                    {tipoAviso[av.tipo] ?? av.tipo}
                    {sinCorreo ? " (ya vencida al activar los avisos)" : ""}
                  </td>
                  <td className={td}>{entregaAviso(av.clave)}</td>
                  <td className={td}>{dia(av.fechaLimite)}</td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>
    </div>
  );
}
