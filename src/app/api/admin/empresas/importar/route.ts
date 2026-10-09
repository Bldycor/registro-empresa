import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { validarEmpresa } from "@/lib/empresas";
import { consultarRuesVarios, type EmpresaRues } from "@/lib/rues";

// Migración de empresas desde una hoja de cálculo (solo ADMIN). El administrador copia las filas
// —NIT, NOMBRE, DIRECCIÓN, DEPARTAMENTO, MUNICIPIO— y las pega; cada fila se valida igual que en
// el registro de una por una (NIT con dígito de verificación, departamento y municipio de la
// lista oficial) y se contrasta con el RUES en una sola consulta.
//
// Con `simular: true` no se guarda nada: el administrador ve fila por fila qué pasaría y luego
// confirma. Solo se crean las empresas nuevas y válidas; las que ya existen en SEPA no se tocan.

type Resultado = {
  fila: number;
  nit: string;
  nombre: string;
  estado: "nueva" | "ya-registrada" | "error" | "repetida-en-archivo";
  errores: string[];
  rues: Pick<EmpresaRues, "razonSocial" | "estadoMatricula"> | null;
  // Avisos que no impiden registrarla: el NIT no figura en el RUES, la matrícula está cancelada…
  avisos: string[];
};

const ENCABEZADOS = /^(nit|nombre|razon|raz[óo]n|empresa|direcci|departamento|municipio)/i;

function partirFila(linea: string): string[] {
  // Copiado desde Excel o Google Sheets viene separado por tabuladores; un CSV, por punto y coma
  // o coma. Se usa el separador que más aparezca.
  const tab = (linea.match(/\t/g) ?? []).length;
  const pyc = (linea.match(/;/g) ?? []).length;
  const separador = tab > 0 ? "\t" : pyc > 0 ? ";" : ",";
  return linea.split(separador).map((c) => c.replace(/^"|"$/g, "").trim());
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN", "COORDINADOR"]);
  if (!user) return response;

  const cuerpo = (await request.json().catch(() => null)) as { filas?: string; simular?: boolean } | null;
  const texto = (cuerpo?.filas ?? "").trim();
  if (!texto) {
    return NextResponse.json({ error: "Pega las filas copiadas de la hoja de cálculo." }, { status: 400 });
  }

  const lineas = texto.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
  // El encabezado es opcional: si la primera fila parece títulos, se salta.
  const datos = ENCABEZADOS.test(lineas[0] ?? "") ? lineas.slice(1) : lineas;
  const desplazamiento = datos.length === lineas.length ? 1 : 2;

  if (datos.length === 0) {
    return NextResponse.json({ error: "No hay filas de datos." }, { status: 400 });
  }
  if (datos.length > 1000) {
    return NextResponse.json({ error: "Son más de 1.000 filas: impórtalas en varias tandas." }, { status: 400 });
  }

  const validadas = datos.map((linea, i) => {
    const [nit, nombre, direccion, departamento, municipio] = partirFila(linea);
    return { fila: i + desplazamiento, crudo: { nit, nombre, direccion, departamento, municipio }, v: validarEmpresa({ nit, nombre, direccion, departamento, municipio }) };
  });

  // Lo que ya está en SEPA y lo que dice el RUES, en dos consultas para todo el archivo.
  const nitsValidos = validadas.flatMap((x) => (x.v.ok ? [x.v.empresa.nit] : []));
  const existentes = new Set(
    (await prisma.empresa.findMany({ where: { nit: { in: nitsValidos } }, select: { nit: true } })).map((e) => e.nit),
  );

  let rues = new Map<string, EmpresaRues>();
  let ruesNoDisponible = false;
  try {
    rues = await consultarRuesVarios(nitsValidos.map((n) => n.split("-")[0]));
  } catch (error) {
    console.error("[admin/empresas/importar] El RUES no respondió:", error);
    ruesNoDisponible = true;
  }

  const vistos = new Set<string>();
  const resultados: Resultado[] = validadas.map(({ fila, crudo, v }) => {
    if (!v.ok) {
      return {
        fila,
        nit: crudo.nit ?? "",
        nombre: crudo.nombre ?? "",
        estado: "error",
        errores: Object.values(v.errores),
        rues: null,
        avisos: [],
      };
    }
    const e = v.empresa;
    const base = e.nit.split("-")[0];
    const enRues = rues.get(base) ?? null;
    const avisos: string[] = [];
    if (!ruesNoDisponible && !enRues) avisos.push("No figura en el RUES (puede ser una entidad pública o estar con otro NIT).");
    if (enRues && enRues.estadoMatricula && enRues.estadoMatricula !== "ACTIVA") {
      avisos.push(`En el RUES la matrícula está ${enRues.estadoMatricula.toLowerCase()}.`);
    }

    let estado: Resultado["estado"] = "nueva";
    if (vistos.has(e.nit)) estado = "repetida-en-archivo";
    else if (existentes.has(e.nit)) estado = "ya-registrada";
    vistos.add(e.nit);

    return {
      fila,
      nit: e.nit,
      nombre: e.nombre,
      estado,
      errores: [],
      rues: enRues ? { razonSocial: enRues.razonSocial, estadoMatricula: enRues.estadoMatricula } : null,
      avisos,
    };
  });

  const nuevas = validadas.filter(
    (x, i) => x.v.ok && resultados[i].estado === "nueva",
  ) as { v: { ok: true; empresa: import("@/lib/empresas").EmpresaValida } }[];

  let creadas = 0;
  if (!cuerpo?.simular && nuevas.length > 0) {
    const r = await prisma.empresa.createMany({
      data: nuevas.map((x) => ({ ...x.v.empresa, creadoPorId: user.id, actualizadoPorId: user.id })),
      skipDuplicates: true,
    });
    creadas = r.count;
  }

  return NextResponse.json({
    simulado: Boolean(cuerpo?.simular),
    ruesNoDisponible,
    resumen: {
      filas: resultados.length,
      nuevas: resultados.filter((r) => r.estado === "nueva").length,
      yaRegistradas: resultados.filter((r) => r.estado === "ya-registrada").length,
      repetidas: resultados.filter((r) => r.estado === "repetida-en-archivo").length,
      conError: resultados.filter((r) => r.estado === "error").length,
      creadas,
    },
    resultados,
  });
}
