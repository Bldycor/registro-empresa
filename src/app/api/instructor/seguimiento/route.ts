import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { SEGUIMIENTO_SELECT, checklistDeAprendiz } from "@/lib/seguimiento-aprendiz";

// Semáforo de cumplimiento de las 6 evidencias para cada aprendiz de las fichas asignadas al
// instructor — resume en un vistazo a quién hay que hacerle seguimiento, sin entrar evidencia
// por evidencia. Cálculo en memoria (no hay muchos aprendices por instructor); si eso cambia,
// se puede empujar a SQL más adelante.
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const aprendices = await prisma.user.findMany({
    where: { role: "APRENDIZ", ficha: { instructorId: user.id } },
    select: SEGUIMIENTO_SELECT,
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  const hoy = new Date();

  const resultado = aprendices.map((a) => {
    const checklist = checklistDeAprendiz(a, hoy);

    const atrasos = checklist.filter((c) => c.estado === "atrasada").length;

    // Paz y salvo: las 6 evidencias ya avaladas/aprobadas — elegible para que el instructor lo
    // marque como "Por certificar" (casilla en el panel). No es lo mismo que `estado ===
    // "POR_CERTIFICAR"`: esto último es la confirmación explícita del instructor, la que dispara
    // el correo con la ficha de requisitos y la que ve Coordinación.
    const evidenciasCompletas = checklist.every((c) => c.estado === "completa");

    return {
      id: a.id,
      nombres: a.nombres,
      apellidos: a.apellidos,
      cedula: a.cedula,
      ficha: a.ficha?.codigo ?? null,
      programa: a.ficha?.programa ?? null,
      estadoAprendiz: a.estado,
      fechaInicioEtapaProductiva: a.fechaInicioEtapaProductiva?.toISOString() ?? null,
      checklist,
      atrasos,
      evidenciasCompletas,
    };
  });

  // Atrasados primero (más atrasos arriba); entre los que no tienen atrasos, los que ya están
  // listos para certificar (o ya se marcaron) suben antes que los que solo van al día — es la
  // lista más accionable para el instructor en un vistazo.
  resultado.sort((x, y) => {
    if (y.atrasos !== x.atrasos) return y.atrasos - x.atrasos;
    return Number(y.evidenciasCompletas) - Number(x.evidenciasCompletas);
  });

  return NextResponse.json({ aprendices: resultado });
}
