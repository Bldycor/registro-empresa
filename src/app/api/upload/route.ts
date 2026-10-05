import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth-guards";

// Genera tokens de subida para el cliente (`upload()` de @vercel/blob/client) — los archivos van
// directo del navegador a Vercel Blob, sin pasar por este servidor. Requiere que el proyecto
// tenga Blob Storage habilitado en Vercel (variable BLOB_READ_WRITE_TOKEN autoprovista).
export async function POST(request: Request) {
  // Todo el handler queda bajo un solo try/catch, incluida la verificación de sesión: esa
  // verificación consulta la base de datos, y un hipo transitorio ahí (Neon, igual que
  // cualquier Postgres serverless, puede tardar en "despertar" tras estar inactivo) antes se
  // propagaba sin capturar — Next.js lo convertía en un 500 sin cuerpo JSON, y el SDK de
  // Vercel Blob en el cliente lo traduce siempre al mismo mensaje genérico en inglés
  // ("Failed to retrieve the client token"), sin importar la causa real. Capturarlo acá permite
  // devolver un JSON que el cliente sabe interpretar y reintentar.
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
          // Tope de 10 MB por archivo: un formato firmado o una foto caben de sobra, y evita que
          // alguien llene el almacenamiento con archivos enormes.
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: user.id, pathname }),
        };
      },
      onUploadCompleted: async () => {
        // No se requiere acción adicional: la URL final la recibe el cliente y la guarda al
        // enviar el formulario de la evidencia correspondiente.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[api/upload] Error al generar el token de subida:", error);
    return NextResponse.json(
      { error: "No se pudo preparar la subida del archivo. Inténtalo de nuevo; si sigue fallando, el archivo puede superar los 10 MB o no ser PDF ni imagen." },
      { status: 400 },
    );
  }
}
