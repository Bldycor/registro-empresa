"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DatePickerField } from "@/components/date-picker-field";
import type { Convocable, SesionListada } from "@/lib/sesiones-grupales";

// Pantalla del instructor para las sesiones grupales (25 nov 2026). Arriba, crear o editar una
// sesión; abajo, las sesiones con sus convocados.

const MOMENTOS = [
  { n: 1, nombre: "Momento 1", detalle: "Concertación · la acompaña Coordinación" },
  { n: 2, nombre: "Momento 2", detalle: "Seguimiento · con el 1 avalado" },
  { n: 3, nombre: "Momento 3", detalle: "Cierre · con el 2 evaluado" },
] as const;

const HORAS = Array.from({ length: 31 }, (_, k) => {
  const min = 6 * 60 + k * 30;
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
});

const SITUACION: Record<Convocable["situacion"], { texto: string; clase: string }> = {
  SIN_AGENDAR: { texto: "Sin agendar", clase: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  INDIVIDUAL: { texto: "Tiene reunión individual: se reemplaza", clase: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  OTRA_SESION: { texto: "En otra sesión grupal: se mueve", clase: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  ESTA_SESION: { texto: "En esta sesión", clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  DEVUELTO: { texto: "Devuelto: se vuelve a agendar", clase: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const ESTADO: Record<string, { texto: string; clase: string }> = {
  PENDIENTE: { texto: "Por valorar", clase: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  APROBADA: { texto: "Valorado", clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  RECHAZADA: { texto: "Devuelto", clase: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const campo =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";

function fechaLegible(f: string) {
  const [y, m, d] = f.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

type Borrador = {
  id?: string;
  momento: 1 | 2 | 3;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  modalidad: "PRESENCIAL" | "VIRTUAL" | "";
  lugar: string;
  elegidos: Set<string>;
};

const VACIO: Borrador = { momento: 2, fecha: "", horaInicio: "", horaFin: "", modalidad: "", lugar: "", elegidos: new Set() };

export function SesionesGrupalesPanel({ sesiones }: { sesiones: SesionListada[] }) {
  const router = useRouter();
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function editar(s: SesionListada) {
    setAviso(null);
    setBorrador({
      id: s.id,
      momento: s.momento,
      fecha: s.fecha,
      horaInicio: s.horaInicio,
      horaFin: s.horaFin,
      modalidad: s.modalidad,
      lugar: s.lugar ?? "",
      elegidos: new Set(s.convocados.map((c) => c.id)),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const proximas = sesiones.filter((s) => !s.empezo);
  const pasadas = sesiones.filter((s) => s.empezo);

  return (
    <div className="flex flex-col gap-6">
      {aviso && (
        <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {aviso}
        </p>
      )}

      {borrador ? (
        <Formulario
          inicial={borrador}
          onCancelar={() => setBorrador(null)}
          onGuardado={(texto) => {
            setBorrador(null);
            setAviso(texto);
            router.refresh();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setAviso(null);
            setBorrador({ ...VACIO, elegidos: new Set() });
          }}
          className="w-fit rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro"
        >
          + Nueva sesión grupal
        </button>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Próximas ({proximas.length})</h2>
        {proximas.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-5 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No tienes sesiones grupales por venir.
          </p>
        )}
        {proximas.map((s) => (
          <TarjetaSesion key={s.id} s={s} onEditar={() => editar(s)} onCancelada={(t) => { setAviso(t); router.refresh(); }} />
        ))}
      </section>

      {pasadas.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Realizadas en los últimos 30 días</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Valora a cada aprendiz en «Evaluaciones», como siempre.</p>
          {pasadas.map((s) => (
            <TarjetaSesion key={s.id} s={s} />
          ))}
        </section>
      )}
    </div>
  );
}

function TarjetaSesion({ s, onEditar, onCancelada }: { s: SesionListada; onEditar?: () => void; onCancelada?: (t: string) => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const momento = MOMENTOS.find((m) => m.n === s.momento)!;

  async function cancelar() {
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/instructor/sesiones-grupales/${s.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setEnviando(false);
    if (!res.ok) {
      setError(data?.error?._root?.[0] ?? "No se pudo cancelar la sesión.");
      return;
    }
    onCancelada?.(
      s.convocados.length === 1
        ? "Sesión cancelada. Al convocado le llega el aviso y su momento queda sin agendar."
        : `Sesión cancelada. A los ${s.convocados.length} convocados les llega el aviso y su momento queda sin agendar.`,
    );
  }

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sena-oscuro dark:text-emerald-400">{momento.nombre}</p>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {fechaLegible(s.fecha)} · {s.horaInicio} - {s.horaFin}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {s.modalidad === "PRESENCIAL" ? `Presencial · ${s.lugar ?? ""}` : "Virtual"}
          </p>
        </div>
        {s.modalidad === "VIRTUAL" && s.videollamadaUrl && !s.empezo && (
          <a href={s.videollamadaUrl} target="_blank" rel="noopener noreferrer" className="rounded-md bg-sena px-3 py-1.5 text-sm font-medium text-white hover:bg-sena-oscuro">
            Abrir videollamada
          </a>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Convocados ({s.convocados.length})</p>
        <ul className="flex flex-wrap gap-1.5">
          {s.convocados.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5 rounded-full border border-zinc-200 py-0.5 pl-2.5 pr-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
              {c.nombre}
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${ESTADO[c.estado]?.clase ?? ""}`}>{ESTADO[c.estado]?.texto ?? c.estado}</span>
            </li>
          ))}
        </ul>
      </div>

      {!s.empezo && onEditar && (
        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button type="button" onClick={onEditar} className="text-sm font-medium text-azul underline dark:text-sky-300">
            Cambiar fecha, lugar o convocados
          </button>
          {!confirmar ? (
            <button type="button" onClick={() => setConfirmar(true)} className="text-sm font-medium text-red-700 underline dark:text-red-400">
              Cancelar sesión
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">¿Cancelarla? Los {s.convocados.length} convocados quedan sin agendar.</span>
              <button type="button" disabled={enviando} onClick={cancelar} className="rounded-md bg-red-700 px-3 py-1 font-medium text-white disabled:opacity-50">
                {enviando ? "Cancelando…" : "Sí, cancelar"}
              </button>
              <button type="button" onClick={() => setConfirmar(false)} className="text-zinc-600 underline dark:text-zinc-400">
                No
              </button>
            </span>
          )}
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </div>
      )}
    </article>
  );
}

function Formulario({ inicial, onCancelar, onGuardado }: { inicial: Borrador; onCancelar: () => void; onGuardado: (texto: string) => void }) {
  const [b, setB] = useState<Borrador>(inicial);
  const [lista, setLista] = useState<Convocable[] | null>(null);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [enviando, setEnviando] = useState(false);
  const editando = Boolean(inicial.id);

  // Los convocables dependen del momento (orden de los momentos).
  useEffect(() => {
    let vigente = true;
    fetch(`/api/instructor/sesiones-grupales?momento=${b.momento}${b.id ? `&sesion=${b.id}` : ""}`)
      .then((r) => r.json())
      .then((d) => vigente && setLista(d.convocables ?? []))
      .catch(() => vigente && setLista([]));
    return () => {
      vigente = false;
    };
  }, [b.momento, b.id]);

  const porFicha = useMemo(() => {
    const m = new Map<string, Convocable[]>();
    for (const c of lista ?? []) m.set(c.ficha || "Sin ficha", [...(m.get(c.ficha || "Sin ficha") ?? []), c]);
    return [...m.entries()].sort(([a], [z]) => a.localeCompare(z));
  }, [lista]);

  const set = (cambio: Partial<Borrador>) => setB((x) => ({ ...x, ...cambio }));
  const alternar = (ids: string[], marcar: boolean) =>
    setB((x) => {
      const e = new Set(x.elegidos);
      for (const id of ids) {
        if (marcar) e.add(id);
        else e.delete(id);
      }
      return { ...x, elegidos: e };
    });

  const listo = b.fecha && b.horaInicio && b.horaFin && b.modalidad && (b.modalidad === "VIRTUAL" || b.lugar.trim().length >= 3) && b.elegidos.size > 0;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    const res = await fetch(editando ? `/api/instructor/sesiones-grupales/${b.id}` : "/api/instructor/sesiones-grupales", {
      method: editando ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        momento: b.momento,
        fecha: b.fecha,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
        modalidad: b.modalidad,
        lugar: b.modalidad === "PRESENCIAL" ? b.lugar : null,
        aprendizIds: [...b.elegidos],
      }),
    });
    const data = await res.json().catch(() => ({}));
    setEnviando(false);
    if (!res.ok) {
      setErrores(typeof data?.error === "object" ? data.error : { _root: ["No se pudo guardar la sesión."] });
      return;
    }
    onGuardado(
      editando
        ? "Sesión actualizada. A quienes les cambió algo les llega el aviso por correo."
        : `Sesión creada con ${b.elegidos.size} convocado${b.elegidos.size === 1 ? "" : "s"}. A cada uno le llega su citación por correo, con copia a su coformador.`,
    );
  }

  const error = (k: string) => errores[k]?.[0];

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{editando ? "Cambiar la sesión grupal" : "Nueva sesión grupal"}</h2>

      <fieldset className="flex flex-col gap-2" disabled={editando}>
        <legend className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">1. ¿Qué momento?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MOMENTOS.map((m) => (
            <button
              key={m.n}
              type="button"
              onClick={() => set({ momento: m.n, elegidos: new Set() })}
              aria-pressed={b.momento === m.n}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed ${
                b.momento === m.n
                  ? "border-sena bg-sena-claro text-zinc-900 dark:bg-emerald-950/40 dark:text-zinc-50"
                  : "border-zinc-200 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className="block font-semibold">{m.nombre}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{m.detalle}</span>
            </button>
          ))}
        </div>
        {editando && <p className="text-xs text-zinc-500 dark:text-zinc-400">El momento de una sesión no se cambia: si necesitas otro, crea otra sesión.</p>}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">2. ¿Cuándo y dónde?</legend>
        <DatePickerField label="Fecha" required value={b.fecha} onChange={(v) => set({ fecha: v })} min={new Date().toISOString().slice(0, 10)} error={error("fecha")} />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Desde
            <select className={campo} value={b.horaInicio} onChange={(e) => set({ horaInicio: e.target.value })} required>
              <option value="">Hora</option>
              {HORAS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Hasta
            <select className={campo} value={b.horaFin} onChange={(e) => set({ horaFin: e.target.value })} required>
              <option value="">Hora</option>
              {HORAS.filter((h) => !b.horaInicio || h > b.horaInicio).map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
        </div>
        {(error("horaInicio") || error("horaFin")) && <p className="text-sm text-red-600">{error("horaInicio") ?? error("horaFin")}</p>}
        <div className="flex flex-wrap gap-2">
          {(["PRESENCIAL", "VIRTUAL"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={b.modalidad === m}
              onClick={() => set({ modalidad: m })}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                b.modalidad === m ? "border-sena bg-sena text-white" : "border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              {m === "PRESENCIAL" ? "Presencial" : "Virtual"}
            </button>
          ))}
        </div>
        {b.modalidad === "PRESENCIAL" && (
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            Lugar
            <input className={campo} value={b.lugar} onChange={(e) => set({ lugar: e.target.value })} placeholder="Ej.: Sede principal, ambiente 204" maxLength={200} />
            {error("lugar") && <span className="text-sm text-red-600">{error("lugar")}</span>}
          </label>
        )}
        {b.modalidad === "VIRTUAL" && <p className="text-xs text-zinc-500 dark:text-zinc-400">SEPA crea un solo enlace de videollamada y se lo envía a cada convocado.</p>}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          3. ¿A quiénes convocas? <span className="font-normal text-zinc-500">({b.elegidos.size} elegido{b.elegidos.size === 1 ? "" : "s"})</span>
        </legend>
        {lista === null && <p className="text-sm text-zinc-500">Cargando aprendices…</p>}
        {lista?.length === 0 && (
          <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Ningún aprendiz de tus fichas puede tener este momento ahora: o ya lo tienen evaluado, o les falta el momento anterior.
          </p>
        )}
        {porFicha.map(([ficha, aprendices]) => {
          const ids = aprendices.map((a) => a.id);
          const todos = ids.every((id) => b.elegidos.has(id));
          return (
            <div key={ficha} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
              <label className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                <input type="checkbox" checked={todos} onChange={(e) => alternar(ids, e.target.checked)} />
                Ficha {ficha} · toda la ficha ({aprendices.length})
              </label>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {aprendices.map((a) => (
                  <li key={a.id}>
                    <label className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input type="checkbox" checked={b.elegidos.has(a.id)} onChange={(e) => alternar([a.id], e.target.checked)} />
                      <span className="font-medium">{a.nombre}</span>
                      <span className="text-xs text-zinc-500">CC {a.cedula}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] ${SITUACION[a.situacion].clase}`}>
                        {SITUACION[a.situacion].texto}
                        {a.agendado && a.situacion !== "ESTA_SESION" ? ` (${a.agendado})` : ""}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {error("aprendizIds") && <p className="text-sm text-red-600">{error("aprendizIds")}</p>}
        {editando && <p className="text-xs text-zinc-500 dark:text-zinc-400">Si quitas a un aprendiz, le llega el aviso y su momento queda sin agendar.</p>}
      </fieldset>

      {error("_root") && <p className="text-sm text-red-600">{error("_root")}</p>}
      {error("momento") && <p className="text-sm text-red-600">{error("momento")}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={!listo || enviando} className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50">
          {enviando ? "Guardando…" : editando ? "Guardar cambios y avisar" : `Convocar a ${b.elegidos.size || ""} aprendiz${b.elegidos.size === 1 ? "" : "es"}`.replace("  ", " ")}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300">
          Cancelar
        </button>
      </div>
    </form>
  );
}
