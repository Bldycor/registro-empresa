import { prisma } from "@/lib/prisma";
import { claveCompetencia, claveResultado } from "@/lib/competencias-duplicados";

// Informe de funciones en la empresa (4 oct 2026, para Coordinación y Administrador).
//
// Responde cuatro preguntas con lo que ya está en SEPA, sin inventar nada:
//   1. Qué funciones hacen los aprendices en la empresa, por ficha y por programa: las
//      ASIGNADAS (plan de trabajo del Momento 1) y las REALIZADAS (actividades de las bitácoras).
//   2. Cuáles son las más comunes.
//   3. Cómo se relacionan con las competencias del programa (catálogo que carga Coordinación).
//   4. Qué funciones no cubre ninguna competencia, como insumo para mejorar el programa.
//
// El análisis es por palabras clave y se puede auditar: cada función se compara con el texto de
// cada competencia y sus resultados de aprendizaje. Si el aprendiz eligió la competencia en la
// bitácora, esa relación manda («declarada»); si no, se busca por contenido («por contenido»).
// No reemplaza el criterio de Coordinación: las recomendaciones son puntos de partida.

// --- Texto -------------------------------------------------------------------------------------

const VACIAS = new Set(
  `a al algo algun alguna algunas alguno algunos ante antes aqui asi aun bien cada como con contra cual cuales
  cuando de del desde donde dos el ella ellas ello ellos en entre era eran es esa esas ese eso esos esta estaba
  estas este esto estos fue fueron gran ha han hasta hay he la las le les lo los mas me mi mis mucho muy nada ni
  no nos nosotros o otra otras otro otros para pero poco por porque que quien se segun ser si sin sobre su sus
  tambien tanto te tiene tienen todo todos tu un una uno unos usted y ya yo cual cuyo mismo misma tal etc
  durante mes meses semana semanas dia dias enero febrero marzo abril mayo junio julio agosto septiembre
  octubre noviembre diciembre funcion funciones actividad actividades realice realizo realizar realizando
  desempene desempeno desempenando desempenar continuado continue principalmente brinde brindando brindar
  area areas empresa labor labores tarea tareas apoyo apoye apoyando cargo trabajo practica etapa productiva
  igualmente ademas tambien asi mismo forma manera parte cuenta acuerdo segun teniendo tener hice hacer haciendo
  cumpliendo cumplir requerimientos requerimiento contexto contextos organizacion organizacional politicas
  diferentes diferente general generales necesidades necesidad establecidos establecidas aplicar aplicando
  desarrollar desarrollando desarrollo proceso procesos productivo social entorno situaciones
  reviso revise verifico verifique apoyo ayudo ayude ayudandolos ayudandoles encargo encargue recibi recibir
  mantener mantengo mantuve organizadas organizados companeras companeros ubicadas ubicados buen buena estado
  necesario cuando ultimas ultimos continuado desempenado brinde realice estuve estar siempre cada vez
  esten este estan diaria diarias diario momento momentos compras persona personas todas mismas mismos asignaran asignara otras otros adelante`
    .split(/\s+/)
    .filter(Boolean),
);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Raíz corta (5 letras): «venta», «ventas» y «vender» caen juntas; «cliente» y «clientes» también.
// Es tosco a propósito: el mismo criterio para todo y fácil de explicar.
function raiz(palabra: string): string {
  return palabra.slice(0, 5);
}

function palabrasClave(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((p) => p.length >= 4 && !VACIAS.has(p) && !/^\d+$/.test(p));
}

// Una bitácora puede traer un párrafo con varias funciones: se parte por viñetas, numerales,
// punto y coma y oraciones. Los renglones partidos a mitad de frase (pasa con lo leído del PDF) se
// vuelven a unir primero. Una palabra suelta, un fragmento sin palabras clave o una «nota» no es
// una función.
const MARCA_ITEM = /^\s*(?:[-–•·*]|\d+\s*[.)]-?)\s*/;
function partirFunciones(texto: string): string[] {
  const unido = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .reduce((acc, linea) => (MARCA_ITEM.test(linea) || acc === "" ? `${acc}\n${linea}` : `${acc} ${linea}`), "");
  return unido
    .split(/\n|[;•·]|(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])|\s\d+\s*[.)]-?\s*(?=[A-ZÁÉÍÓÚÑ])|\s-\s/)
    .map((f) => f.replace(MARCA_ITEM, "").trim())
    .filter((f) => palabrasClave(f).length >= 1 && f.split(/\s+/).length >= 2 && !/^nota\b/i.test(f));
}

function etiquetaFuncion(texto: string): string {
  const limpio = texto.replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
  const corto = limpio.length > 90 ? `${limpio.slice(0, 90).replace(/\s+\S*$/, "")}…` : limpio;
  return corto.charAt(0).toUpperCase() + corto.slice(1);
}

// --- Tipos -------------------------------------------------------------------------------------

// «coincide»: lo que dice la función se parece a una competencia del programa. «declarada»: no
// se parece a ninguna por contenido, pero el aprendiz eligió una en la bitácora. «ninguna»: ni lo
// uno ni lo otro. Lo que no coincide por contenido es lo que alimenta las recomendaciones.
export type Relacion = "coincide" | "declarada" | "ninguna";

export type FuncionAnalizada = {
  aprendizId: string;
  aprendiz: string;
  ficha: string;
  programa: string;
  origen: "asignada" | "realizada";
  bitacora: number | null;
  texto: string;
  clave: string; // texto normalizado, para agrupar funciones iguales
  relacion: Relacion;
  competencia: string | null; // competencia del catálogo con la que se relaciona
  declarada: string | null; // la que eligió el aprendiz en la bitácora, si es del catálogo
  similitud: number; // 0–1, solo informativo
};

type Catalogo = Map<string, { nombre: string; raices: Map<string, number> }>; // por competencia

export type FiltrosFunciones = { programa: string; ficha: string };

// --- Comparación con el catálogo ---------------------------------------------------------------

// Las funciones en la empresa se comparan con las competencias TÉCNICAS del programa. Las
// básicas y clave (inglés, matemáticas, TIC, ética…) son transversales: no describen un oficio, y
// compararlas por palabras solo produce coincidencias falsas. Tampoco la fila genérica
// «Resultados de aprendizaje etapa práctica» (código 999999999), que está en todos los programas.
type FilaCatalogo = { nombreCompetencia: string; resultadoAprendizaje: string; tipo: string; codigoCompetencia: string };
export const esTecnica = (f: { tipo: string; codigoCompetencia: string }) =>
  f.tipo === "TECNICA" && f.codigoCompetencia !== "999999999";

function construirCatalogo(todas: FilaCatalogo[]) {
  const filas = todas.filter(esTecnica);
  const porCompetencia = new Map<string, { nombre: string; textos: string[] }>();
  for (const f of filas) {
    const c = porCompetencia.get(f.nombreCompetencia) ?? { nombre: f.nombreCompetencia, textos: [f.nombreCompetencia] };
    c.textos.push(f.resultadoAprendizaje);
    porCompetencia.set(f.nombreCompetencia, c);
  }
  // Peso de cada raíz: más alto cuanto menos competencias la usan (una palabra que está en todas
  // no distingue nada).
  const enCuantas = new Map<string, number>();
  const raicesDe = new Map<string, Set<string>>();
  for (const [nombre, c] of porCompetencia) {
    const set = new Set(c.textos.flatMap((t) => palabrasClave(t).map(raiz)));
    raicesDe.set(nombre, set);
    for (const r of set) enCuantas.set(r, (enCuantas.get(r) ?? 0) + 1);
  }
  const total = Math.max(1, porCompetencia.size);
  const catalogo: Catalogo = new Map();
  for (const [nombre] of porCompetencia) {
    const pesos = new Map<string, number>();
    for (const r of raicesDe.get(nombre) ?? []) pesos.set(r, Math.log(1 + total / (enCuantas.get(r) ?? 1)));
    catalogo.set(nombre, { nombre, raices: pesos });
  }
  // Para reconocer lo que el aprendiz eligió en la bitácora (nombre de competencia o, en datos
  // viejos, un resultado de aprendizaje).
  const competenciaDeTexto = new Map<string, string>();
  for (const f of todas) {
    competenciaDeTexto.set(`C:${claveCompetencia(f.nombreCompetencia)}`, f.nombreCompetencia);
    competenciaDeTexto.set(`R:${claveResultado(f.resultadoAprendizaje)}`, f.nombreCompetencia);
  }
  const transversales = new Set(todas.filter((f) => !esTecnica(f)).map((f) => f.nombreCompetencia)).size;
  return { catalogo, competenciaDeTexto, transversales };
}

const UMBRAL_CONTENIDO = 0.27;

function mejorCoincidencia(texto: string, catalogo: Catalogo): { competencia: string | null; similitud: number } {
  const raices = [...new Set(palabrasClave(texto).map(raiz))];
  if (raices.length === 0 || catalogo.size === 0) return { competencia: null, similitud: 0 };
  let mejor: { competencia: string | null; similitud: number } = { competencia: null, similitud: 0 };
  for (const c of catalogo.values()) {
    const coinciden = raices.filter((r) => c.raices.has(r));
    if (coinciden.length === 0) continue;
    // Qué parte de la función está «dicha» por la competencia, ponderando las palabras distintivas.
    const pesoCoincide = coinciden.reduce((s, r) => s + (c.raices.get(r) ?? 0), 0);
    const pesoMax = Math.max(...c.raices.values());
    const similitud = Math.min(1, pesoCoincide / (raices.length * pesoMax * 0.6));
    if (similitud > mejor.similitud) mejor = { competencia: c.nombre, similitud };
  }
  return mejor;
}

// --- Informe -----------------------------------------------------------------------------------

export async function construirInformeFunciones(f: FiltrosFunciones) {
  const whereFicha = {
    ...(f.programa ? { programa: f.programa } : {}),
    ...(f.ficha ? { codigo: f.ficha } : {}),
  };

  const [aprendices, fichasTodas] = await Promise.all([
    prisma.user.findMany({
      where: { role: "APRENDIZ", ficha: { is: whereFicha } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        ficha: { select: { codigo: true, programa: true } },
        concertacionFuncion: { select: { actividadesDesarrollar: true } },
        bitacoras: {
          select: { numero: true, actividades: { select: { descripcion: true, competencias: true } } },
          orderBy: { numero: "asc" },
        },
      },
    }),
    prisma.ficha.findMany({ select: { codigo: true, programa: true }, orderBy: { codigo: "asc" } }),
  ]);

  const programas = [...new Set(aprendices.map((a) => a.ficha?.programa).filter((p): p is string => !!p))];
  const filasCatalogo = await prisma.competenciaFormacion.findMany({
    where: { programa: { in: programas } },
    select: { programa: true, nombreCompetencia: true, resultadoAprendizaje: true, tipo: true, codigoCompetencia: true },
  });
  const catalogos = new Map(
    programas.map((p) => [p, construirCatalogo(filasCatalogo.filter((c) => c.programa === p))]),
  );

  const funciones: FuncionAnalizada[] = [];
  for (const a of aprendices) {
    const programa = a.ficha?.programa ?? "Sin programa";
    const ficha = a.ficha?.codigo ?? "Sin ficha";
    const cat = catalogos.get(programa);
    const base = { aprendizId: a.id, aprendiz: `${a.nombres} ${a.apellidos}`, ficha, programa };

    const analizar = (texto: string, origen: FuncionAnalizada["origen"], bitacora: number | null, declarada?: string | null) => {
      for (const parte of partirFunciones(texto)) {
        const elegida =
          declarada && cat
            ? (cat.competenciaDeTexto.get(`C:${claveCompetencia(declarada)}`) ??
              cat.competenciaDeTexto.get(`R:${claveResultado(declarada)}`) ??
              null)
            : null;
        const coincidencia = cat ? mejorCoincidencia(parte, cat.catalogo) : { competencia: null, similitud: 0 };
        const relacion: Relacion =
          coincidencia.similitud >= UMBRAL_CONTENIDO ? "coincide" : elegida ? "declarada" : "ninguna";
        funciones.push({
          ...base,
          origen,
          bitacora,
          texto: etiquetaFuncion(parte),
          clave: palabrasClave(parte).map(raiz).join(" "),
          relacion,
          competencia: relacion === "coincide" ? coincidencia.competencia : elegida,
          declarada: elegida,
          similitud: Math.round(coincidencia.similitud * 100) / 100,
        });
      }
    };

    if (a.concertacionFuncion?.actividadesDesarrollar) {
      analizar(a.concertacionFuncion.actividadesDesarrollar, "asignada", null);
    }
    for (const b of a.bitacoras) {
      for (const act of b.actividades) analizar(act.descripcion, "realizada", b.numero, act.competencias);
    }
  }

  // Funciones más comunes: funciones con las mismas palabras clave se cuentan juntas.
  const comunes = new Map<string, { texto: string; menciones: number; aprendices: Set<string>; fichas: Set<string> }>();
  for (const fn of funciones) {
    const g = comunes.get(fn.clave) ?? { texto: fn.texto, menciones: 0, aprendices: new Set(), fichas: new Set() };
    g.menciones++;
    g.aprendices.add(fn.aprendizId);
    g.fichas.add(fn.ficha);
    if (fn.texto.length < g.texto.length) g.texto = fn.texto;
    comunes.set(fn.clave, g);
  }
  const funcionesComunes = [...comunes.values()]
    .map((g) => ({ texto: g.texto, menciones: g.menciones, aprendices: g.aprendices.size, fichas: [...g.fichas] }))
    .sort((x, y) => y.aprendices - x.aprendices || y.menciones - x.menciones)
    .slice(0, 10);

  // Palabras clave más frecuentes (por cuántos aprendices las usan), con la forma más común.
  const palabras = new Map<string, { formas: Map<string, number>; aprendices: Set<string>; menciones: number }>();
  for (const fn of funciones) {
    for (const p of new Set(palabrasClave(fn.texto))) {
      const r = raiz(p);
      const g = palabras.get(r) ?? { formas: new Map(), aprendices: new Set(), menciones: 0 };
      g.formas.set(p, (g.formas.get(p) ?? 0) + 1);
      g.aprendices.add(fn.aprendizId);
      g.menciones++;
      palabras.set(r, g);
    }
  }
  const palabrasFrecuentes = [...palabras.entries()]
    .map(([r, g]) => ({
      raiz: r,
      palabra: [...g.formas.entries()].sort((x, y) => y[1] - x[1])[0][0],
      aprendices: g.aprendices.size,
      menciones: g.menciones,
    }))
    .sort((x, y) => y.menciones - x.menciones || y.aprendices - x.aprendices)
    .slice(0, 16);

  // Cobertura por programa y por ficha.
  const cobertura = (lista: FuncionAnalizada[]) => ({
    total: lista.length,
    coincide: lista.filter((x) => x.relacion === "coincide").length,
    declarada: lista.filter((x) => x.relacion === "declarada").length,
    ninguna: lista.filter((x) => x.relacion === "ninguna").length,
    conCompetenciaElegida: lista.filter((x) => x.declarada).length,
  });

  const porPrograma = programas
    .map((programa) => {
      const lista = funciones.filter((x) => x.programa === programa);
      const competenciasPrograma = [...(catalogos.get(programa)?.catalogo.keys() ?? [])];
      const usoCompetencia = competenciasPrograma
        .map((c) => {
          const relacionadas = lista.filter((x) => x.competencia === c);
          return {
            competencia: c,
            funciones: relacionadas.length,
            aprendices: new Set(relacionadas.map((x) => x.aprendizId)).size,
          };
        })
        .sort((x, y) => y.funciones - x.funciones || x.competencia.localeCompare(y.competencia));
      return {
        programa,
        aprendices: aprendices.filter((a) => a.ficha?.programa === programa).length,
        aprendicesConFunciones: new Set(lista.map((x) => x.aprendizId)).size,
        cobertura: cobertura(lista),
        competencias: usoCompetencia,
        transversales: catalogos.get(programa)?.transversales ?? 0,
        sinRelacion: agruparSinRelacion(lista.filter((x) => x.relacion !== "coincide")),
      };
    })
    .sort((x, y) => y.cobertura.total - x.cobertura.total || x.programa.localeCompare(y.programa));

  const fichasConAprendices = [...new Set(aprendices.map((a) => a.ficha?.codigo).filter((c): c is string => !!c))];
  const porFicha = fichasConAprendices
    .map((codigo) => {
      const lista = funciones.filter((x) => x.ficha === codigo);
      const top = new Map<string, { texto: string; n: number }>();
      for (const fn of lista) {
        const g = top.get(fn.clave) ?? { texto: fn.texto, n: 0 };
        g.n++;
        top.set(fn.clave, g);
      }
      return {
        ficha: codigo,
        programa: aprendices.find((a) => a.ficha?.codigo === codigo)?.ficha?.programa ?? "",
        aprendices: aprendices.filter((a) => a.ficha?.codigo === codigo).length,
        aprendicesConFunciones: new Set(lista.map((x) => x.aprendizId)).size,
        cobertura: cobertura(lista),
        principales: [...top.values()].sort((x, y) => y.n - x.n).slice(0, 3),
        funciones: lista,
      };
    })
    .sort((x, y) => y.cobertura.total - x.cobertura.total || x.ficha.localeCompare(y.ficha));

  const total = cobertura(funciones);
  const conFunciones = new Set(funciones.map((x) => x.aprendizId)).size;

  return {
    filtros: f,
    opciones: {
      programas: [...new Set(fichasTodas.map((x) => x.programa).filter((p): p is string => !!p))].sort(),
      fichas: fichasTodas.filter((x) => !f.programa || x.programa === f.programa).map((x) => x.codigo),
    },
    kpi: {
      funciones: total.total,
      asignadas: funciones.filter((x) => x.origen === "asignada").length,
      realizadas: funciones.filter((x) => x.origen === "realizada").length,
      aprendices: aprendices.length,
      aprendicesConFunciones: conFunciones,
      cobertura: total,
      fichas: porFicha.filter((x) => x.cobertura.total > 0).length,
    },
    funcionesComunes,
    palabrasFrecuentes,
    porPrograma,
    porFicha,
    recomendaciones: recomendar(porPrograma, total.total, conFunciones),
  };
}

// Funciones sin competencia relacionada, agrupadas por su palabra clave más repetida.
function agruparSinRelacion(lista: FuncionAnalizada[]) {
  const conteo = new Map<string, { palabra: string; funciones: FuncionAnalizada[] }>();
  const frecuencia = new Map<string, number>();
  for (const fn of lista) for (const p of new Set(palabrasClave(fn.texto))) frecuencia.set(raiz(p), (frecuencia.get(raiz(p)) ?? 0) + 1);
  for (const fn of lista) {
    const claves = palabrasClave(fn.texto);
    const principal = [...claves].sort((x, y) => (frecuencia.get(raiz(y)) ?? 0) - (frecuencia.get(raiz(x)) ?? 0))[0];
    if (!principal) continue;
    const g = conteo.get(raiz(principal)) ?? { palabra: principal, funciones: [] };
    g.funciones.push(fn);
    conteo.set(raiz(principal), g);
  }
  return [...conteo.values()]
    .map((g) => ({
      tema: g.palabra,
      funciones: g.funciones.length,
      aprendices: new Set(g.funciones.map((x) => x.aprendizId)).size,
      ejemplos: [...new Set(g.funciones.map((x) => x.texto))].slice(0, 3),
    }))
    .sort((x, y) => y.aprendices - x.aprendices || y.funciones - x.funciones);
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

type Recomendacion = { tipo: "brecha" | "competencia" | "datos" | "registro"; programa?: string; texto: string };

function recomendar(
  porPrograma: {
    programa: string;
    cobertura: { total: number; coincide: number; declarada: number; ninguna: number; conCompetenciaElegida: number };
    competencias: { competencia: string; funciones: number }[];
    sinRelacion: { tema: string; funciones: number; aprendices: number; ejemplos: string[] }[];
  }[],
  totalFunciones: number,
  aprendicesConFunciones: number,
): Recomendacion[] {
  const r: Recomendacion[] = [];
  if (totalFunciones < 30 || aprendicesConFunciones < 5) {
    r.push({
      tipo: "datos",
      texto: `El análisis se basa en ${plural(totalFunciones, "función", "funciones")} de ${plural(aprendicesConFunciones, "aprendiz", "aprendices")}: las conclusiones son preliminares. Se vuelven confiables a medida que más aprendices diligencien sus bitácoras en SEPA.`,
    });
  }
  for (const p of porPrograma) {
    for (const g of p.sinRelacion.slice(0, 3)) {
      r.push({
        tipo: "brecha",
        programa: p.programa,
        texto: `${plural(g.funciones, "función", "funciones")} sobre «${g.tema}» (${plural(g.aprendices, "aprendiz", "aprendices")}) no se parece${g.funciones === 1 ? "" : "n"} por contenido a ninguna competencia técnica del programa. Acción de mejora: revisar con el equipo curricular si conviene incorporar resultados de aprendizaje o formación complementaria sobre este tema, o si la función no corresponde al perfil del programa y debe concertarse con la empresa. Ejemplos: ${g.ejemplos.map((e) => `«${e}»`).join(", ")}.`,
      });
    }
    const sinUso = p.competencias.filter((c) => c.funciones === 0);
    if (p.cobertura.total >= 10 && sinUso.length > 0) {
      r.push({
        tipo: "competencia",
        programa: p.programa,
        texto: `${plural(sinUso.length, "competencia técnica", "competencias técnicas")} del programa no aparece${sinUso.length === 1 ? "" : "n"} en ninguna función reportada (por ejemplo «${sinUso[0].competencia}»). Revisar en la concertación del Momento 1 que el plan de trabajo permita desarrollarlas, o reforzarlas en la etapa lectiva.`,
      });
    }
    if (p.cobertura.total > 0 && p.cobertura.conCompetenciaElegida / p.cobertura.total < 0.5) {
      r.push({
        tipo: "registro",
        programa: p.programa,
        texto: `Solo el ${Math.round((p.cobertura.conCompetenciaElegida / p.cobertura.total) * 100)} % de las funciones trae la competencia elegida en la bitácora. Pedir a los aprendices que la seleccionen en cada actividad mejora la precisión de este informe.`,
      });
    }
  }
  return r;
}

export type InformeFunciones = Awaited<ReturnType<typeof construirInformeFunciones>>;
