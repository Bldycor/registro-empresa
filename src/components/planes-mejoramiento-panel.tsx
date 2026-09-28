"use client";

import { useEffect, useState } from "react";
import { StatBadge } from "@/components/stat-badge";
import { FileUploadField } from "@/components/file-upload-field";
import { PlanTarjeta, type PlanItem } from "@/components/plan-mejoramiento";
import { PLAZO_MAXIMO_PLAN_MEJORAMIENTO_DIAS } from "@/lib/validations";

// Planes de mejoramiento de los aprendices del instructor (guía GFPI-G-040 §9.4; Acuerdo 009).
// El instructor los redacta y los verifica; Coordinación los autoriza. Nada de esto bloquea la
// certificación: si el plan queda abierto o no cumplido, solo aparece como advertencia.

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

const MOMENTOS = [
  { valor: 1, label: "Momento 1 — Concertación" },
  { valor: 2, label: "Momento 2 — Seguimiento" },
  { valor: 3, label: "Momento 3 — Cierre" },
];

type Borrador = {
  momento: number;
  resultadosNoSuperados: string;
  actividades: string;
  evidencias: string;
  llamadosPrevios: string;
  diasPlazo: number;
};

const BORRADOR_VACIO: Borrador = {
  momento: 2,
  resultadosNoSuperados: "",
  actividades: "",
  evidencias: "",
  llamadosPrevios: "",
  diasPlazo: 15,
};

function completo(b: Borrador): boolean {
  return (
    b.resultadosNoSuperados.trim().length >= 10 &&
    b.actividades.trim().length >= 10 &&
    b.evidencias.trim().length >= 10 &&
    b.llamadosPrevios.trim().length >= 10 &&
    b.diasPlazo >= 1 &&
    b.diasPlazo <= PLAZO_MAXIMO_PLAN_MEJORAMIENTO_DIAS
  );
}

// Los cuatro bloques de texto que exige el reglamento, con el mismo orden en el formulario y en
// la tarjeta.
function CamposPlan({
  borrador,
  onChange,
}: {
  borrador: Borrador;
  onChange: (b: Borrador) => void;
}) {
  const campos: [keyof Borrador, string, string][] = [
    [
      "resultadosNoSuperados",
      "Resultados de aprendizaje que no se superaron",
      "Cuáles quedaron pendientes y por qué.",
    ],
    ["actividades", "Actividades de aprendizaje", "Qué debe hacer el aprendiz para superarlos."],
    [
      "evidencias",
      "Evidencias por presentar",
      "De conocimiento, de desempeño y de producto.",
    ],
    [
      "llamadosPrevios",
      "Llamados de atención previos",
      "Fechas y motivo de los dos llamados académicos que exige el Acuerdo 009.",
    ],
  ];

  return (
    <>
      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Momento de evaluación
        <select
          value={borrador.momento}
          onChange={(e) => onChange({ ...borrador, momento: Number(e.target.value) })}
          className={inputClass}
        >
          {MOMENTOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      {campos.map(([clave, titulo, ayuda]) => (
        <label key={clave} className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          {titulo}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{ayuda}</span>
          <textarea
            value={borrador[clave] as string}
            onChange={(e) => onChange({ ...borrador, [clave]: e.target.value })}
            rows={3}
            maxLength={clave === "llamadosPrevios" ? 1000 : 2000}
            className={inputClass}
          />
        </label>
      ))}

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Plazo en días calendario
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Máximo {PLAZO_MAXIMO_PLAN_MEJORAMIENTO_DIAS} días. Se cuentan desde que Coordinación lo
          autoriza, y se recortan si la etapa productiva termina antes.
        </span>
        <input
          type="number"
          min={1}
          max={PLAZO_MAXIMO_PLAN_MEJORAMIENTO_DIAS}
          value={borrador.diasPlazo}
          onChange={(e) => onChange({ ...borrador, diasPlazo: Number(e.target.value) })}
          className={`${inputClass} w-28`}
        />
      </label>
    </>
  );
}

export function PlanesMejoramientoPanel({
  aprendices,
}: {
  aprendices: { id: string; nombre: string }[];
}) {
  const [planes, setPlanes] = useState<PlanItem[] | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [userId, setUserId] = useState("");
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  // Plan que se está corrigiendo (devuelto) o cerrando, con lo que se está escribiendo.
  const [corrigiendo, setCorrigiendo] = useState<string | null>(null);
  const [correccion, setCorreccion] = useState<Borrador>(BORRADOR_VACIO);
  const [cerrando, setCerrando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<"CUMPLIDO" | "NO_CUMPLIDO">("CUMPLIDO");
  const [verificacion, setVerificacion] = useState("");
  const [soporteUrl, setSoporteUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    fetch("/api/instructor/planes-mejoramiento")
      .then((res) => res.json())
      .then((data) => setPlanes(data.planes ?? []))
      .catch(() => setPlanes([]));
  }

  useEffect(cargar, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const res = await fetch("/api/instructor/planes-mejoramiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...borrador }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setErrors(typeof data.error === "string" ? { _root: [data.error] } : (data.error ?? {}));
      return;
    }
    setAbierto(false);
    setUserId("");
    setBorrador(BORRADOR_VACIO);
    cargar();
  }

  async function enviar(id: string, cuerpo: Record<string, unknown>) {
    setGuardando(true);
    setErrors({});
    const res = await fetch(`/api/instructor/planes-mejoramiento/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const data = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) {
      setErrors(typeof data.error === "string" ? { _root: [data.error] } : (data.error ?? {}));
      return false;
    }
    cargar();
    return true;
  }

  if (planes === null) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</p>;
  }

  const porAutorizar = planes.filter((p) => p.estado === "POR_AUTORIZAR").length;
  const vigentes = planes.filter((p) => p.estado === "VIGENTE").length;
  const vencidos = planes.filter((p) => p.vencido).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge tono="azul" etiqueta="planes" cantidad={planes.length} />
        <StatBadge tono="ambar" etiqueta="por autorizar" cantidad={porAutorizar} />
        <StatBadge tono="verde" etiqueta="vigentes" cantidad={vigentes} />
        <StatBadge tono="rojo" etiqueta="con plazo vencido" cantidad={vencidos} />
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
        >
          {abierto ? "Cancelar" : "Abrir plan de mejoramiento"}
        </button>
      </div>

      {abierto && (
        <form
          onSubmit={crear}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Lo redactas tú y lo autoriza la coordinación académica: hasta entonces el plazo no
            corre y el aprendiz no recibe la comunicación.
          </p>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Aprendiz
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={inputClass}
              required
            >
              <option value="" disabled>
                Selecciona
              </option>
              {aprendices.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            {errors.userId && <span className="text-sm text-red-600">{errors.userId[0]}</span>}
          </label>

          <CamposPlan borrador={borrador} onChange={setBorrador} />

          {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
          <button
            type="submit"
            disabled={loading || !userId || !completo(borrador)}
            className="w-fit rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
          >
            {loading ? "Enviando…" : "Enviar a coordinación"}
          </button>
        </form>
      )}

      {planes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No hay planes de mejoramiento.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {planes.map((plan) => (
            <PlanTarjeta key={plan.id} plan={plan}>
              {plan.estado === "DEVUELTO" && (
                <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {corrigiendo === plan.id ? (
                    <div className="flex flex-col gap-3">
                      <CamposPlan borrador={correccion} onChange={setCorreccion} />
                      {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={guardando || !completo(correccion)}
                          onClick={async () => {
                            const ok = await enviar(plan.id, { accion: "CORREGIR", ...correccion });
                            if (ok) setCorrigiendo(null);
                          }}
                          className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
                        >
                          {guardando ? "Enviando…" : "Enviar corregido"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCorrigiendo(null)}
                          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCorrigiendo(plan.id);
                        setErrors({});
                        setCorreccion({
                          momento: plan.momento,
                          resultadosNoSuperados: plan.resultadosNoSuperados,
                          actividades: plan.actividades,
                          evidencias: plan.evidencias,
                          llamadosPrevios: plan.llamadosPrevios,
                          diasPlazo: plan.diasPlazo,
                        });
                      }}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      Corregir y reenviar
                    </button>
                  )}
                </div>
              )}

              {plan.estado === "VIGENTE" && (
                <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  {cerrando === plan.id ? (
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                        Resultado de la verificación
                        <select
                          value={resultado}
                          onChange={(e) => setResultado(e.target.value as typeof resultado)}
                          className={inputClass}
                        >
                          <option value="CUMPLIDO">Cumplido</option>
                          <option value="NO_CUMPLIDO">No cumplido</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                        ¿Qué verificaste?
                        <textarea
                          value={verificacion}
                          onChange={(e) => setVerificacion(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          className={inputClass}
                          placeholder="Qué evidencias presentó el aprendiz y qué resultados quedaron superados."
                        />
                      </label>
                      <FileUploadField
                        label="Plan firmado (opcional)"
                        pathPrefix="plan-mejoramiento"
                        value={soporteUrl}
                        onChange={setSoporteUrl}
                        onUploadingChange={setSubiendo}
                      />
                      {errors._root && <p className="text-sm text-red-600">{errors._root[0]}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={guardando || subiendo || verificacion.trim().length < 10}
                          onClick={async () => {
                            const ok = await enviar(plan.id, {
                              accion: "CERRAR",
                              resultado,
                              verificacion,
                              soporteUrl,
                            });
                            if (ok) {
                              setCerrando(null);
                              setVerificacion("");
                              setSoporteUrl(null);
                              setResultado("CUMPLIDO");
                            }
                          }}
                          className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50 dark:bg-sena dark:text-white"
                        >
                          {guardando ? "Guardando…" : "Cerrar el plan"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCerrando(null)}
                          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCerrando(plan.id);
                        setErrors({});
                        setVerificacion("");
                        setSoporteUrl(null);
                        setResultado("CUMPLIDO");
                      }}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      Verificar y cerrar
                    </button>
                  )}
                </div>
              )}
            </PlanTarjeta>
          ))}
        </ul>
      )}
    </div>
  );
}
