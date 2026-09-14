import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { DesercionSchema } from "@/lib/validations";

// Declaración (y reversión) de deserción — guía GFPI-G-040 §9.1.1.
//
// Endpoint propio, separado de la edición general del aprendiz, por dos razones: la causa es
// obligatoria (queda como constancia del acto administrativo, con quién lo declaró y cuándo), y
// declararla desde el mismo selector con el que se corrige un correo invita al error. El sistema
// solo señala el riesgo (src/lib/desercion.ts); la decisión es de Coordinación.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, estado: true },
  });
  if (!existing || existing.role !== "APRENDIZ") {
    return NextResponse.json({ error: { _root: ["El aprendiz no existe."] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = DesercionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  if (d.desertor && existing.estado === "CERTIFICADO") {
    return NextResponse.json(
      { error: { _root: ["Este aprendiz ya fue certificado: no puede declararse en deserción."] } },
      { status: 409 },
    );
  }
  if (!d.desertor && existing.estado !== "DESERTADO") {
    return NextResponse.json({ aprendiz: { estado: existing.estado } });
  }

  const aprendiz = await prisma.user.update({
    where: { id },
    data: d.desertor
      ? {
          estado: "DESERTADO",
          fechaDesercion: new Date(),
          motivoDesercion: d.motivoDesercion?.trim() ?? null,
          declaradoDesertorPorId: user.id,
        }
      : {
          // Al revertir vuelve a ACTIVO: el tramo, los días acumulados y las evidencias quedaron
          // intactos mientras estuvo en deserción, así que retoma exactamente donde estaba.
          estado: "ACTIVO",
          fechaDesercion: null,
          motivoDesercion: null,
          declaradoDesertorPorId: null,
        },
    select: {
      id: true,
      estado: true,
      fechaDesercion: true,
      motivoDesercion: true,
    },
  });

  return NextResponse.json({ aprendiz });
}
