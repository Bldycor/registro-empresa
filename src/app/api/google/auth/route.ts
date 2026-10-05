import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guards";
import { getOAuthClient } from "@/lib/google-calendar";

// Conexión de SEPA con Google Calendar: tarea de configuración que hace una vez el administrador
// (4 oct 2026: antes podía iniciarla cualquier usuario con sesión). El `state` aleatorio, guardado
// en una cookie de corta duración, impide que alguien complete la conexión con un enlace armado
// por un tercero.
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador conecta Google Calendar." }, { status: 403 });
  }

  const state = crypto.randomBytes(24).toString("hex");
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state,
  });

  const respuesta = NextResponse.redirect(url);
  respuesta.cookies.set("sepa_google_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/api/google",
  });
  return respuesta;
}
