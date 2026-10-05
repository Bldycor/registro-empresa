import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth-guards";
import { getOAuthClient } from "@/lib/google-calendar";

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return textResponse("No autenticado.", 401);
  }
  if (user.role !== "ADMIN") {
    return textResponse("Solo el administrador conecta Google Calendar.", 403);
  }

  const { searchParams } = new URL(request.url);
  const almacen = await cookies();
  const stateEsperado = almacen.get("sepa_google_state")?.value;
  almacen.delete({ name: "sepa_google_state", path: "/api/google" });
  if (!stateEsperado || searchParams.get("state") !== stateEsperado) {
    return textResponse("La conexión no se inició desde SEPA o ya expiró. Vuelve a empezar en /api/google/auth.", 400);
  }

  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return textResponse(`Autorización cancelada o rechazada por Google: ${error}`, 400);
  }
  if (!code) {
    return textResponse("Falta el parámetro 'code' en la respuesta de Google.", 400);
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    return textResponse(
      "Google no devolvió un refresh_token (esto pasa si ya habías autorizado la app antes). " +
        "Ve a https://myaccount.google.com/permissions, quita el acceso de esta app, y vuelve a intentar " +
        "en /api/google/auth para forzar una nueva pantalla de consentimiento.",
      400
    );
  }

  // No se escribe a disco: en producción (Vercel) el sistema de archivos es de solo lectura, y
  // las variables de entorno se administran desde el dashboard/CLI de Vercel, no desde un .env en
  // el servidor. Se muestra el token para copiarlo y pegarlo ahí a mano (GOOGLE_REFRESH_TOKEN).
  return textResponse(
    "Conexión con Google Calendar completada correctamente.\n\n" +
      `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"\n\n` +
      "Copia ese valor y actualízalo como variable de entorno (en Vercel: Settings → Environment " +
      "Variables → GOOGLE_REFRESH_TOKEN), luego vuelve a desplegar. En local, pégalo en tu .env.local " +
      "y reinicia el servidor de desarrollo. Ya puedes cerrar esta pestaña."
  );
}
