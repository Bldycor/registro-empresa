import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/lib/auth-guards";

// Genera tokens de subida para el cliente (`upload()` de @vercel/blob/client) — los archivos van
// directo del navegador a Vercel Blob, sin pasar por este servidor. Requiere que el proyecto
// tenga Blob Storage habilitado en Vercel (variable BLOB_READ_WRITE_TOKEN autoprovista).
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
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
      { error: error instanceof Error ? error.message : "Error al generar el token de subida." },
      { status: 400 },
    );
  }
}
