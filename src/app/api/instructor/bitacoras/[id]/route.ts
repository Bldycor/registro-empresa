import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { z } from "zod";
import { leerBitacoraDeUrl } from "@/lib/leer-bitacora-url";

const AvalSchema = z.object({
  estado: z.enum(["APROBADA", "RECHAZADA"]),
  observaciones: z.string().trim().nullable().optional(),
});

// Avala o rechaza la bitácora de un aprendiz — solo el instructor asignado a la ficha de ese
// aprendiz puede hacerlo (misma regla que el resto de la app).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.bitacora.findUnique({
    where: { id },
    select: { id: true, user: { select: { ficha: { select: { instructorId: true } } } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "La bitácora no existe." }, { status: 404 });
  }
  if (existing.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "No autorizado: este aprendiz no está en tus fichas asignadas." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = AvalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const bitacora = await prisma.bitacora.update({
    where: { id },
    data: {
      estado: d.estado,
      avaladoPorId: user.id,
      fechaAval: new Date(),
      observaciones: d.observaciones ?? null,
    },
  });

  return NextResponse.json({ bitacora });
}

// Las actividades del documento adjunto a ESTA bitácora (9 nov 2026). El formulario del aprendiz
// copiaba las de la bitácora anterior, y el instructor terminaba evaluando las actividades de otro
// mes: aquí se leen del PDF firmado, que es la evidencia. No guarda nada.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR", "COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;
  const bitacora = await prisma.bitacora.findUnique({
    where: { id },
    select: { archivoUrl: true, user: { select: { ficha: { select: { instructorId: true } } } } },
  });
  if (!bitacora) {
    return NextResponse.json({ error: "La bitácora no existe." }, { status: 404 });
  }
  if (user.role === "INSTRUCTOR" && bitacora.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "No autorizado: este aprendiz no está en tus fichas asignadas." },
      { status: 403 }
    );
  }
  if (!bitacora.archivoUrl) return NextResponse.json({ fuente: "sin-archivo", actividades: [] });

  const lectura = await leerBitacoraDeUrl(bitacora.archivoUrl);
  if (lectura.error) return NextResponse.json({ fuente: "error", actividades: [] });
  if (lectura.esImagen) return NextResponse.json({ fuente: "foto", actividades: [] });
  if (lectura.sinTexto) return NextResponse.json({ fuente: "sin-texto", actividades: [] });
  const actividades = lectura.actividades ?? [];
  return NextResponse.json({ fuente: actividades.length ? "pdf" : "no-reconocida", actividades });
}
