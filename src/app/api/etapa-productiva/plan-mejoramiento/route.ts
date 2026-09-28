import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { cargarPlanes } from "@/lib/plan-mejoramiento";

// Los planes de mejoramiento del propio aprendiz (guía GFPI-G-040 §9.4). Solo consulta: el plan
// lo redacta el instructor y lo autoriza Coordinación; el aprendiz lo cumple.
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  return NextResponse.json({ planes: await cargarPlanes({ userId: user.id }) });
}
