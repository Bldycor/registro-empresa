import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { parseFichaImportText } from "@/lib/ficha-import";

// Importación masiva de fichas desde el control institucional en hoja de cálculo (pegar texto
// separado por tabulaciones, con o sin fila de encabezado — ver src/lib/ficha-import.ts).
// Solo CREA fichas nuevas: si un código ya existe en el sistema, no se toca (para no pisar datos
// que el coordinador ya haya editado a mano) y se reporta aparte como "ya existía".
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto : "";

  if (!texto.trim()) {
    return NextResponse.json({ error: "Pega el contenido de la hoja de cálculo." }, { status: 400 });
  }

  const { filas, errores } = parseFichaImportText(texto);

  const codigosEnLote = filas.map((f) => f.codigo);
  const existentes = await prisma.ficha.findMany({
    where: { codigo: { in: codigosEnLote } },
    select: { codigo: true },
  });
  const yaExistianSet = new Set(existentes.map((f) => f.codigo));

  const creadas: string[] = [];
  const yaExistian: string[] = [];
  const erroresGuardado: { codigo: string; motivo: string }[] = [];

  for (const fila of filas) {
    if (yaExistianSet.has(fila.codigo)) {
      yaExistian.push(fila.codigo);
      continue;
    }

    try {
      await prisma.ficha.create({
        data: {
          codigo: fila.codigo,
          programa: fila.programa,
          estado: fila.estado,
          nivelFormacion: fila.nivelFormacion,
          jornada: fila.jornada,
          fechaInicioFicha: fila.fechaInicioFicha,
          fechaInicioProductiva: fila.fechaInicioProductiva,
          fechaFinFormacion: fila.fechaFinFormacion,
          fechaLimiteIniciarEP: fila.fechaLimiteIniciarEP,
        },
      });
      creadas.push(fila.codigo);
    } catch (error) {
      console.error("[api/coordinador/fichas/import] Error al guardar ficha:", fila.codigo, error);
      erroresGuardado.push({ codigo: fila.codigo, motivo: "Error inesperado al guardar." });
    }
  }

  return NextResponse.json({
    creadas,
    yaExistian,
    errores: [
      ...errores.map((e) => ({ motivo: `Línea ${e.linea}: ${e.motivo}` })),
      ...erroresGuardado.map((e) => ({ motivo: `Ficha ${e.codigo}: ${e.motivo}` })),
    ],
  });
}
