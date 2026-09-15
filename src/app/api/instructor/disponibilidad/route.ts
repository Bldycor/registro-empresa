import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { franjasOcupadasInstructor } from "@/lib/reuniones";

// Franjas ya ocupadas en la agenda del instructor un día dado, para reprogramar una reunión desde
// su panel. `excluir` deja fuera la reunión que se está moviendo, y `tipo=concertacion` suma las
// concertaciones de todas las fichas, porque Coordinación las acompaña todas.
export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const ocupados = await franjasOcupadasInstructor({
    instructorId: user.id,
    fecha: new Date(`${fecha}T00:00:00.000Z`),
    tipo: searchParams.get("tipo") === "concertacion" ? "CONCERTACION" : "EVALUACION",
    excluirId: searchParams.get("excluir"),
  });

  return NextResponse.json({ ocupados });
}
