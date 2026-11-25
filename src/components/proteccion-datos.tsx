import { CANAL_DERECHOS, DERECHOS_TITULAR, POLITICA_DATOS } from "@/lib/proteccion-datos";

// Avisos de protección de datos (Ley 1581 de 2012), con la política del SENA (Acuerdos 13 de 2019
// y 9 de 2016). Tres usos: la entrada (aviso breve), el registro del aprendiz (con la casilla de
// autorización, aparte) y la creación de cuentas por otro rol (la prevención para quien crea).

function Enlaces() {
  return (
    <span>
      Política del SENA:{" "}
      {POLITICA_DATOS.map((p, k) => (
        <span key={p.url}>
          {k > 0 && " y "}
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="underline">
            {p.nombre}
          </a>
        </span>
      ))}
      .
    </span>
  );
}

function Detalle() {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <p>
        El SENA es el responsable del tratamiento. Tus datos se usan solo con tu autorización previa, expresa e
        informada, y aquí sirven para el seguimiento de la etapa productiva.
      </p>
      <div>
        <p className="font-medium">Tus derechos</p>
        <ul className="mt-1 list-disc pl-5">
          {DERECHOS_TITULAR.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
      <p>
        <span className="font-medium">Cómo ejercerlos:</span> {CANAL_DERECHOS}
      </p>
      <p>
        <Enlaces />
      </p>
    </div>
  );
}

// Aviso breve, desplegable, para la entrada y el registro.
export function AvisoDatos({ className = "" }: { className?: string }) {
  return (
    <details className={`group rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
        <span aria-hidden>🛡️</span>
        <span>Tus datos están protegidos (Ley 1581 de 2012)</span>
        <span aria-hidden className="ml-auto transition-transform group-open:rotate-90">›</span>
      </summary>
      <Detalle />
    </details>
  );
}

// Prevención para quien crea o importa cuentas de otras personas.
export function PrevencionDatosCreacion() {
  return (
    <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>🛡️</span> Protección de datos personales (Ley 1581 de 2012)
      </p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
        <li>Registra solo datos de personas que autorizaron su tratamiento de forma previa, expresa e informada.</li>
        <li>Usa los datos solo para el seguimiento de la etapa productiva: darles otro uso requiere una nueva autorización.</li>
        <li>Si la persona pide conocer, actualizar o suprimir sus datos, indícale los canales de PQRS del SENA.</li>
      </ul>
      <p className="mt-1.5">
        <Enlaces />
      </p>
    </div>
  );
}

export { Detalle as DetalleDatos };
