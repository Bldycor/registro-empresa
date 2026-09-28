import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { cargarPlanes } from "@/lib/plan-mejoramiento";

// Todos los planes de mejoramiento del centro (guía GFPI-G-040 §9.4). Coordinación es quien los
// autoriza: sin su firma el plan no está suscrito y el plazo no arranca.
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  return NextResponse.json({ planes: await cargarPlanes() });
}
