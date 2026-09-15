"use client";

import { useState } from "react";
import Link from "next/link";
import { DatePickerField } from "@/components/date-picker-field";
import { fechaMinimaInicioEtapaProductiva } from "@/lib/etapa-productiva-fechas";
import { TotalBitacorasValues, type AlternativaEtapaProductivaValue } from "@/lib/validations";

type FichaFechas = {
  fechaInicioProductiva: string | null;
  fechaLimiteIniciarEP: string | null;
};

type Ficha = { id: string; codigo: string } & FichaFechas;

type Aprendiz = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  alternativaEtapaProductiva: AlternativaEtapaProductivaValue | null;
  fechaInicioEtapaProductiva: string | null;
  fechaFinEtapaProductiva: string | null;
  totalBitacoras: number;
  ficha:
    | ({
        id: string;
        codigo: string;
        instructorId: string | null;
        instructor: { nombres: string; apellidos: string } | null;
      } & FichaFechas)
    | null;
};

const OTROS_VALUE = "__OTROS__";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function aFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC" });
}

function aFechaInput(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// Vista de aprendices del Instructor, organizada por ficha propia — cada ficha asignada es su
// propio grupo (evaluable), y los aprendices que no están a su cargo (sin ficha, o con ficha de
// otro instructor) quedan aparte, en el mismo orden ascendente por nombre que ya trae la consulta
// del servidor (orderBy nombres/apellidos asc — no se reordena acá).
//
// Las fechas de Etapa Productiva las calcula el sistema al crear la cuenta (desde la fecha
// institucional de la ficha), pero cada aprendiz puede iniciar en una fecha real distinta según
// cuándo lo reciba su empresa — por eso el instructor puede corregirlas acá, una por una o para
// toda la ficha de un golpe si toda la cohorte arrancó junta. Los límites (fecha calculada de la
// ficha, con la excepción de 3 meses antes para Vínculo laboral, y la fecha límite institucional
// para iniciar EP) se validan en el servidor — acá solo se muestran y se aplican al selector para
// que el instructor los vea antes de intentar guardar.
export function InstructorAprendicesPanel({
  aprendices: aprendicesIniciales,
  fichasAsignadas,
}: {
  aprendices: Aprendiz[];
  fichasAsignadas: Ficha[];
}) {
  const [aprendices, setAprendices] = useState<Aprendiz[]>(aprendicesIniciales);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroFicha, setFiltroFicha] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [fichaConFormulario, setFichaConFormulario] = useState<string | null>(null);

  const misFichaIds = new Set(fichasAsignadas.map((f) => f.id));

  function actualizarAprendiz(id: string, cambios: Partial<Aprendiz>) {
    setAprendices((prev) => prev.map((a) => (a.id === id ? { ...a, ...cambios } : a)));
  }

  function actualizarFicha(fichaId: string, cambios: Partial<Aprendiz>) {
    setAprendices((prev) => prev.map((a) => (a.ficha?.id === fichaId ? { ...a, ...cambios } : a)));
  }

  const coincideTexto = (a: Aprendiz) => {
    const texto = filtroTexto.trim().toLowerCase();
    if (!texto) return true;
    const nombreCompleto = `${a.nombres} ${a.apellidos}`.toLowerCase();
    return nombreCompleto.includes(texto) || a.cedula.includes(texto);
  };

  const aprendicesFiltrados = aprendices.filter(coincideTexto);

  const grupos = fichasAsignadas
    .filter((f) => !filtroFicha || filtroFicha === f.id)
    .map((f) => ({
      ficha: f,
      aprendices: aprendicesFiltrados.filter((a) => a.ficha?.id === f.id),
    }));

  const otros = aprendicesFiltrados.filter(
    (a) => !a.ficha || !misFichaIds.has(a.ficha.id)
  );
  const mostrarOtros = !filtroFicha || filtroFicha === OTROS_VALUE;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {aprendicesFiltrados.length} de {aprendices.length} aprendiz(es)
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por nombre o cédula"
              className={`${inputClass} w-52`}
            />
            <select
              value={filtroFicha}
              onChange={(e) => setFiltroFicha(e.target.value)}
              className={`${inputClass} text-xs`}
            >
              <option value="">Todas mis fichas</option>
              {fichasAsignadas.map((f) => (
                <option key={f.id} value={f.id}>
                  Ficha {f.codigo}
                </option>
              ))}
              <option value={OTROS_VALUE}>Sin ficha a mi cargo</option>
            </select>
          </div>
        </div>
      </div>

      {aprendices.length === 0 ? (
        <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay aprendices registrados.
        </p>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {grupos.map(({ ficha, aprendices: aprendicesFicha }) => (
            <div key={ficha.id}>
              <div className="bg-zinc-50 px-6 py-2 dark:bg-zinc-950/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Ficha {ficha.codigo}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {aprendicesFicha.length} aprendiz(es)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFichaConFormulario((prev) => (prev === ficha.id ? null : ficha.id))
                      }
                      className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {fichaConFormulario === ficha.id ? "Cancelar" : "Cambiar fechas / bitácoras de la ficha"}
                    </button>
                  </div>
                </div>
                {fichaConFormulario === ficha.id && (
                  <FichaFechasForm ficha={ficha} onAplicado={(cambios) => actualizarFicha(ficha.id, cambios)} />
                )}
              </div>
              {aprendicesFicha.length === 0 ? (
                <p className="px-6 py-3 text-xs text-zinc-400 dark:text-zinc-500">
                  Ningún aprendiz de esta ficha coincide con el filtro.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {aprendicesFicha.map((aprendiz) => (
                    <AprendizRow
                      key={aprendiz.id}
                      aprendiz={aprendiz}
                      evaluable
                      editando={editandoId === aprendiz.id}
                      onToggleEditar={() =>
                        setEditandoId((prev) => (prev === aprendiz.id ? null : aprendiz.id))
                      }
                      onGuardado={(cambios) => {
                        actualizarAprendiz(aprendiz.id, cambios);
                        setEditandoId(null);
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}

          {mostrarOtros && (
            <div>
              <div className="flex items-center justify-between bg-zinc-50 px-6 py-2 dark:bg-zinc-950/40">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Sin ficha a mi cargo
                </h3>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {otros.length} aprendiz(es)
                </span>
              </div>
              {otros.length === 0 ? (
                <p className="px-6 py-3 text-xs text-zinc-400 dark:text-zinc-500">
                  Ningún aprendiz coincide con el filtro.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {otros.map((aprendiz) => (
                    <AprendizRow key={aprendiz.id} aprendiz={aprendiz} evaluable={false} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AprendizRow({
  aprendiz,
  evaluable,
  editando,
  onToggleEditar,
  onGuardado,
}: {
  aprendiz: Aprendiz;
  evaluable: boolean;
  editando?: boolean;
  onToggleEditar?: () => void;
  onGuardado?: (cambios: Partial<Aprendiz>) => void;
}) {
  return (
    <li className="flex flex-col gap-2 px-6 py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {aprendiz.nombres} {aprendiz.apellidos}{" "}
            <Link
              href={`/formulario/expediente/${aprendiz.id}`}
              className="ml-1 text-xs font-medium text-zinc-500 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Ver expediente
            </Link>
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {aprendiz.email} · Cédula: {aprendiz.cedula}
            {!aprendiz.ficha && " · Sin ficha asignada"}
            {!evaluable && aprendiz.ficha && (
              <>
                {" · Ficha "}
                {aprendiz.ficha.codigo}
                {" · "}
                {aprendiz.ficha.instructor
                  ? `Instructor: ${aprendiz.ficha.instructor.nombres} ${aprendiz.ficha.instructor.apellidos}`
                  : "Ficha sin instructor"}
              </>
            )}
            {" · EP: "}
            {aprendiz.fechaInicioEtapaProductiva ? (
              <>
                {aFechaCorta(aprendiz.fechaInicioEtapaProductiva)}
                {aprendiz.fechaFinEtapaProductiva && ` – ${aFechaCorta(aprendiz.fechaFinEtapaProductiva)}`}
              </>
            ) : (
              "sin fecha definida"
            )}
            {` · ${aprendiz.totalBitacoras} bitácoras`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {evaluable && onToggleEditar && (
            <button
              type="button"
              onClick={onToggleEditar}
              className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {editando ? "Cancelar" : "Editar fechas / bitácoras"}
            </button>
          )}
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
              evaluable
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {evaluable ? "Evaluable" : "Solo consulta"}
          </span>
        </div>
      </div>

      {editando && onGuardado && aprendiz.ficha && (
        <AprendizFechasForm
          aprendizId={aprendiz.id}
          fechaInicioInicial={aprendiz.fechaInicioEtapaProductiva?.slice(0, 10) ?? ""}
          fechaFinInicial={aprendiz.fechaFinEtapaProductiva?.slice(0, 10) ?? ""}
          totalBitacorasInicial={aprendiz.totalBitacoras}
          ficha={aprendiz.ficha}
          esVinculoLaboral={aprendiz.alternativaEtapaProductiva === "VINCULO_LABORAL"}
          onGuardado={onGuardado}
        />
      )}
    </li>
  );
}

function AprendizFechasForm({
  aprendizId,
  fechaInicioInicial,
  fechaFinInicial,
  totalBitacorasInicial,
  ficha,
  esVinculoLaboral,
  onGuardado,
}: {
  aprendizId: string;
  fechaInicioInicial: string;
  fechaFinInicial: string;
  totalBitacorasInicial: number;
  ficha: FichaFechas;
  esVinculoLaboral: boolean;
  onGuardado: (cambios: Partial<Aprendiz>) => void;
}) {
  const [fechaInicio, setFechaInicio] = useState(fechaInicioInicial);
  const [fechaFin, setFechaFin] = useState(fechaFinInicial);
  const [totalBitacoras, setTotalBitacoras] = useState(totalBitacorasInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechaInicioProductivaFicha = ficha.fechaInicioProductiva
    ? new Date(ficha.fechaInicioProductiva)
    : null;
  const minimaInicio = fechaMinimaInicioEtapaProductiva(fechaInicioProductivaFicha, esVinculoLaboral);
  const maximaInicio = ficha.fechaLimiteIniciarEP ? new Date(ficha.fechaLimiteIniciarEP) : null;

  async function guardar() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/instructor/aprendices/${aprendizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fechaInicioEtapaProductiva: fechaInicio || null,
        fechaFinEtapaProductiva: fechaFin || null,
        totalBitacoras,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const primerError =
        typeof data.error === "string"
          ? data.error
          : Object.values(data.error ?? {})
              .flat()
              .find((m): m is string => typeof m === "string");
      setError(primerError ?? "No se pudieron guardar las fechas.");
      return;
    }

    onGuardado({
      fechaInicioEtapaProductiva: data.aprendiz.fechaInicioEtapaProductiva,
      fechaFinEtapaProductiva: data.aprendiz.fechaFinEtapaProductiva,
      totalBitacoras: data.aprendiz.totalBitacoras,
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      {(minimaInicio || maximaInicio) && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Fecha de inicio permitida
          {minimaInicio && ` desde ${aFechaCorta(minimaInicio.toISOString())}`}
          {maximaInicio && ` hasta ${aFechaCorta(maximaInicio.toISOString())}`}
          {esVinculoLaboral && " (incluye los 3 meses de anticipo por Vínculo laboral)"}.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DatePickerField
          label="Fecha de inicio"
          value={fechaInicio}
          onChange={setFechaInicio}
          min={minimaInicio ? aFechaInput(minimaInicio) : undefined}
          max={maximaInicio ? aFechaInput(maximaInicio) : undefined}
        />
        <DatePickerField label="Fecha de fin" value={fechaFin} onChange={setFechaFin} min={fechaInicio || undefined} />
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          Total de bitácoras
          <select
            value={totalBitacoras}
            onChange={(e) => setTotalBitacoras(Number(e.target.value))}
            className={inputClass}
          >
            {TotalBitacorasValues.map((v) => (
              <option key={v} value={v}>
                {v} (Etapa Productiva de {v === 12 ? "6" : "3"} meses)
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={guardar}
        disabled={loading}
        className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

function FichaFechasForm({
  ficha,
  onAplicado,
}: {
  ficha: Ficha;
  onAplicado: (cambios: Partial<Aprendiz>) => void;
}) {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [totalBitacoras, setTotalBitacoras] = useState<"" | "6" | "12">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aplicados, setAplicados] = useState<number | null>(null);

  // Regla estricta (sin la excepción de Vínculo laboral): esta ficha puede tener aprendices con
  // distintas alternativas, y esa excepción de 3 meses de anticipo es individual.
  const minimaInicio = ficha.fechaInicioProductiva ? new Date(ficha.fechaInicioProductiva) : null;
  const maximaInicio = ficha.fechaLimiteIniciarEP ? new Date(ficha.fechaLimiteIniciarEP) : null;

  async function aplicar() {
    if (!fechaInicio) {
      setError("Selecciona la fecha de inicio.");
      return;
    }
    setLoading(true);
    setError(null);
    setAplicados(null);

    const res = await fetch(`/api/instructor/fichas/${ficha.id}/fechas`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fechaInicioEtapaProductiva: fechaInicio,
        fechaFinEtapaProductiva: fechaFin || null,
        totalBitacoras: totalBitacoras ? Number(totalBitacoras) : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const primerError =
        typeof data.error === "string"
          ? data.error
          : Object.values(data.error ?? {})
              .flat()
              .find((m): m is string => typeof m === "string");
      setError(primerError ?? "No se pudieron aplicar las fechas.");
      return;
    }

    setAplicados(data.actualizados);
    onAplicado({
      fechaInicioEtapaProductiva: data.fechaInicioEtapaProductiva,
      fechaFinEtapaProductiva: data.fechaFinEtapaProductiva,
      ...(data.totalBitacoras !== undefined ? { totalBitacoras: data.totalBitacoras } : {}),
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Aplica la misma fecha de inicio (y, si quieres, el mismo total de bitácoras) a todos los
        aprendices de esta ficha — útil si toda la cohorte arrancó su Etapa Productiva el mismo
        día. La fecha de fin se calcula sola (+6 meses) si no la das.
        {(minimaInicio || maximaInicio) && " Fecha de inicio permitida"}
        {minimaInicio && ` desde ${aFechaCorta(minimaInicio.toISOString())}`}
        {maximaInicio && ` hasta ${aFechaCorta(maximaInicio.toISOString())}`}
        {(minimaInicio || maximaInicio) && "."} Puedes seguir corrigiendo a un aprendiz individual
        después (ahí sí aplica la excepción de Vínculo laboral).
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DatePickerField
          label="Fecha de inicio"
          required
          value={fechaInicio}
          onChange={setFechaInicio}
          min={minimaInicio ? aFechaInput(minimaInicio) : undefined}
          max={maximaInicio ? aFechaInput(maximaInicio) : undefined}
        />
        <DatePickerField label="Fecha de fin (opcional)" value={fechaFin} onChange={setFechaFin} min={fechaInicio || undefined} />
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          Total de bitácoras (opcional)
          <select
            value={totalBitacoras}
            onChange={(e) => setTotalBitacoras(e.target.value as "" | "6" | "12")}
            className={inputClass}
          >
            <option value="">No cambiar</option>
            {TotalBitacorasValues.map((v) => (
              <option key={v} value={v}>
                {v} (Etapa Productiva de {v === 12 ? "6" : "3"} meses)
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {aplicados !== null && (
        <p className="text-xs text-emerald-700 dark:text-emerald-500">
          Fechas aplicadas a {aplicados} aprendiz(es).
        </p>
      )}
      <button
        type="button"
        onClick={aplicar}
        disabled={loading}
        className="w-fit rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Aplicando..." : "Aplicar a toda la ficha"}
      </button>
    </div>
  );
}
