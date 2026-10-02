// Consulta del Registro Único Empresarial y Social (RUES) de las Cámaras de Comercio, publicado por
// Confecámaras en Datos Abiertos Colombia: «Personas Naturales, Personas Jurídicas y Entidades Sin
// Ánimo de Lucro» (www.datos.gov.co, conjunto c82u-588k), actualizado a diario.
//
// Sirve para que el administrador registre cada empresa con su razón social oficial y vea si la
// matrícula sigue activa, en vez de copiar el nombre que cada aprendiz escribió a su manera.
//
// PRIVACIDAD: el registro trae también el nombre y la cédula del representante legal. Aquí se pide
// solo lo que describe a la empresa (`$select`), así que esos datos personales nunca se consultan
// ni se guardan. El NIT de una empresa es información pública del registro mercantil.

const URL_RUES = "https://www.datos.gov.co/resource/c82u-588k.json";

export type EmpresaRues = {
  nit: string;
  razonSocial: string;
  digitoVerificacion: string | null;
  estadoMatricula: string | null;
  camaraComercio: string | null;
  organizacionJuridica: string | null;
  ultimoAnoRenovado: string | null;
};

const CAMPOS = [
  "nit",
  "numero_identificacion",
  "razon_social",
  "digito_verificacion",
  "estado_matricula",
  "camara_comercio",
  "organizacion_juridica",
  "ultimo_ano_renovado",
  "categoria_matricula",
].join(",");

type FilaRues = Partial<Record<string, string>>;

// Una misma empresa puede tener varias filas (su sede principal y sus establecimientos, o una
// matrícula vieja cancelada). Se prefiere la principal y activa.
function mejorFila(filas: FilaRues[]): FilaRues | null {
  if (filas.length === 0) return null;
  const puntaje = (f: FilaRues) =>
    (f.estado_matricula === "ACTIVA" ? 2 : 0) + (/PRINCIPAL|JURIDICA/i.test(f.categoria_matricula ?? "") ? 1 : 0);
  return [...filas].sort((a, b) => puntaje(b) - puntaje(a))[0];
}

function aEmpresa(f: FilaRues): EmpresaRues {
  return {
    nit: f.nit ?? f.numero_identificacion ?? "",
    razonSocial: (f.razon_social ?? "").trim(),
    digitoVerificacion: f.digito_verificacion ?? null,
    estadoMatricula: f.estado_matricula ?? null,
    camaraComercio: f.camara_comercio ?? null,
    organizacionJuridica: f.organizacion_juridica ?? null,
    ultimoAnoRenovado: f.ultimo_ano_renovado ?? null,
  };
}

async function consultar(where: string): Promise<FilaRues[]> {
  const url = `${URL_RUES}?$select=${CAMPOS}&$where=${encodeURIComponent(where)}&$limit=5000`;
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  if (!respuesta.ok) throw new Error(`RUES respondió ${respuesta.status}`);
  return (await respuesta.json()) as FilaRues[];
}

// Una empresa por su NIT (sin el dígito de verificación). `null` si no está en el registro.
export async function consultarRues(nitBase: string): Promise<EmpresaRues | null> {
  if (!/^\d{5,15}$/.test(nitBase)) return null;
  const filas = await consultar(`nit='${nitBase}' OR numero_identificacion='${nitBase}'`);
  const fila = mejorFila(filas);
  return fila ? aEmpresa(fila) : null;
}

// Varias empresas en una sola consulta (para la importación desde hoja de cálculo).
export async function consultarRuesVarios(nitsBase: string[]): Promise<Map<string, EmpresaRues>> {
  const validos = [...new Set(nitsBase.filter((n) => /^\d{5,15}$/.test(n)))];
  const resultado = new Map<string, EmpresaRues>();
  // Se consulta en tandas para no armar una dirección demasiado larga.
  for (let i = 0; i < validos.length; i += 150) {
    const tanda = validos.slice(i, i + 150);
    const lista = tanda.map((n) => `'${n}'`).join(",");
    const filas = await consultar(`nit in (${lista}) OR numero_identificacion in (${lista})`);
    // Cada fila se asigna al NIT que se pidió y con el que coincide; las que no coinciden con
    // ninguno se descartan (hay registros donde `nit` y `numero_identificacion` difieren).
    const pedidos = new Set(tanda);
    const porNit = new Map<string, FilaRues[]>();
    for (const f of filas) {
      const clave = [f.nit, f.numero_identificacion].find((v) => v && pedidos.has(v));
      if (!clave) continue;
      porNit.set(clave, [...(porNit.get(clave) ?? []), f]);
    }
    for (const [nit, grupo] of porNit) {
      const fila = mejorFila(grupo);
      if (fila) resultado.set(nit, aEmpresa(fila));
    }
  }
  return resultado;
}
