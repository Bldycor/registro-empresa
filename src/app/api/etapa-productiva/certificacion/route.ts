import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { CertificacionEmpresarioSchema, VENTANA_CERTIFICACION_DIAS } from "@/lib/validations";

const CERTIFICACION_SELECT = {
  id: true,
  fecha: true,
  archivoUrl: true,
  estado: true,
  observaciones: true,
  fechaAval: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Certificación del Empresario del propio aprendiz — una vigente por aprendiz (se puede
// reemplazar si el instructor la rechaza y el aprendiz vuelve a subirla).
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const certificacion = await prisma.certificacionEmpresario.findUnique({
    where: { userId: user.id },
    select: CERTIFICACION_SELECT,
  });

  return NextResponse.json({ certificacion });
}

// Crea o reemplaza la certificación del aprendiz (upsert: si ya existía una rechazada, la
// reemplaza y vuelve a quedar PENDIENTE). La fecha del documento debe caer dentro de la ventana
// institucional alrededor de la fecha de fin de EP del aprendiz, cuando esa fecha ya se conoce
// (se captura en la evidencia (a) Selección de Alternativa) — si aún no se conoce, no se puede
// validar la ventana y se deja pasar.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = CertificacionEmpresarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const aprendiz = await prisma.user.findUnique({
    where: { id: user.id },
    select: { fechaFinEtapaProductiva: true },
  });
  const fechaFinEP = aprendiz?.fechaFinEtapaProductiva ?? null;
  const fecha = new Date(d.fecha);

  if (fechaFinEP) {
    const msDia = 24 * 60 * 60 * 1000;
    const min = new Date(fechaFinEP.getTime() - VENTANA_CERTIFICACION_DIAS * msDia);
    const max = new Date(fechaFinEP.getTime() + VENTANA_CERTIFICACION_DIAS * msDia);
    if (fecha.getTime() < min.getTime() || fecha.getTime() > max.getTime()) {
      const fmt = (f: Date) => f.toLocaleDateString("es-CO", { timeZone: "UTC" });
      return NextResponse.json(
        {
          error: {
            fecha: [
              `La fecha del documento debe estar entre ${fmt(min)} y ${fmt(max)} (${VENTANA_CERTIFICACION_DIAS} días antes/después de tu fin de Etapa Productiva, ${fmt(fechaFinEP)}).`,
            ],
          },
        },
        { status: 400 },
      );
    }
  }

  const certificacion = await prisma.certificacionEmpresario.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fecha,
      archivoUrl: d.archivoUrl,
    },
    update: {
      fecha,
      archivoUrl: d.archivoUrl,
      estado: "PENDIENTE",
      avaladoPorId: null,
      fechaAval: null,
      observaciones: null,
    },
    select: CERTIFICACION_SELECT,
  });

  return NextResponse.json({ certificacion }, { status: 201 });
}
