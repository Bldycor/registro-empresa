import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-guards";
import { enviarRechazosSinAvisar } from "@/lib/avisos-rechazo-pendientes";

// Envío único del aviso de rechazo a las evidencias que ya estaban rechazadas (10 nov 2026).
export const maxDuration = 300;

export async function POST() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;
  return NextResponse.json(await enviarRechazosSinAvisar());
}
