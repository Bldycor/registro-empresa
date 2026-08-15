import { promises as fs } from "fs";
import path from "path";
import { auth } from "@/auth";
import { getOAuthClient } from "@/lib/google-calendar";

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return textResponse("No autenticado.", 401);
  }

  const { searchParams } = new URL(request.url);
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

  const envPath = path.join(process.cwd(), ".env");
  let envContent = "";
  try {
    envContent = await fs.readFile(envPath, "utf-8");
  } catch {
    envContent = "";
  }

  const line = `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`;
  envContent = envContent.includes("GOOGLE_REFRESH_TOKEN=")
    ? envContent.replace(/GOOGLE_REFRESH_TOKEN=".*"/g, line)
    : `${envContent.trimEnd()}\n${line}\n`;

  await fs.writeFile(envPath, envContent, "utf-8");

  return textResponse(
    "Conexión con Google Calendar completada correctamente.\n\n" +
      "El token quedó guardado en el archivo .env del servidor.\n" +
      "Reinicia el servidor de desarrollo para que tome el cambio. Ya puedes cerrar esta pestaña."
  );
}
