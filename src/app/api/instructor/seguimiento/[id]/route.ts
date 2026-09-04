import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { calcularSeguimiento } from "@/lib/seguimiento-evidencias";
import { sendPorCertificarEmail } from "@/lib/mailer";

const BodySchema = z.object({ porCertificar: z.boolean() });

// Marca (o revierte) a un aprendiz como "Por certificar" — casilla de verificación del panel de
// Seguimiento del instructor. Solo puede marcarlo el instructor asignado a la ficha del
// aprendiz, y solo cuando las 6 evidencias ya quedaron avaladas/aprobadas (se revalida en el
// servidor, no se confía en lo que muestre el cliente). Al marcarlo por primera vez se envía el
// correo con la ficha de requisitos de certificación; desmarcarlo (corrección) no reenvía nada.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const aprendiz = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      email: true,
      role: true,
      estado: true,
      fechaInicioEtapaProductiva: true,
      fechaFinEtapaProductiva: true,
      ficha: { select: { instructorId: true, fechaLimiteIniciarEP: true } },
      seleccionesAlternativa: {
        select: { estado: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      formalizacionEtapaProductiva: { select: { estado: true } },
      concertacionFuncion: { select: { fecha: true } },
      bitacoras: { select: { numero: true, estado: true } },
      evaluaciones: {
        where: { numero: { in: [2, 3] }, esExtraordinario: false },
        select: { numero: true, estado: true },
      },
      certificacionEmpresario: { select: { estado: true } },
    },
  });

  if (!aprendiz || aprendiz.role !== "APRENDIZ") {
    return NextResponse.json({ error: "El aprendiz no existe." }, { status: 404 });
  }
  if (aprendiz.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "No autorizado: este aprendiz no está en tus fichas asignadas." },
      { status: 403 },
    );
  }

  const { porCertificar } = parsed.data;

  if (!porCertificar) {
    if (aprendiz.estado !== "POR_CERTIFICAR") {
      return NextResponse.json({ aprendiz: { estado: aprendiz.estado } });
    }
    const actualizado = await prisma.user.update({
      where: { id },
      data: { estado: "ACTIVO", porCertificarPorId: null, fechaPorCertificar: null },
      select: { estado: true },
    });
    return NextResponse.json({ aprendiz: actualizado });
  }

  if (aprendiz.estado === "CERTIFICADO") {
    return NextResponse.json(
      { error: "Este aprendiz ya fue certificado por Coordinación." },
      { status: 400 },
    );
  }
  if (aprendiz.estado === "POR_CERTIFICAR") {
    return NextResponse.json({ aprendiz: { estado: aprendiz.estado } });
  }

  const checklist = calcularSeguimiento({
    hoy: new Date(),
    fechaInicioEP: aprendiz.fechaInicioEtapaProductiva,
    fechaFinEP: aprendiz.fechaFinEtapaProductiva,
    fechaLimiteIniciarEPFicha: aprendiz.ficha?.fechaLimiteIniciarEP ?? null,
    alternativaAprobada: aprendiz.seleccionesAlternativa[0]?.estado === "APROBADA",
    formalizacionAprobada: aprendiz.formalizacionEtapaProductiva?.estado === "APROBADA",
    concertacionFecha: aprendiz.concertacionFuncion?.fecha ?? null,
    bitacoras: aprendiz.bitacoras,
    evaluacion2Aprobada: aprendiz.evaluaciones.some((e) => e.numero === 2 && e.estado === "APROBADA"),
    evaluacion3Aprobada: aprendiz.evaluaciones.some((e) => e.numero === 3 && e.estado === "APROBADA"),
    certificacionAprobada: aprendiz.certificacionEmpresario?.estado === "APROBADA",
  });

  if (!checklist.every((c) => c.estado === "completa")) {
    return NextResponse.json(
      { error: "Todavía tiene evidencias sin avalar — no se puede marcar como Por certificar." },
      { status: 400 },
    );
  }

  const actualizado = await prisma.user.update({
    where: { id },
    data: { estado: "POR_CERTIFICAR", porCertificarPorId: user.id, fechaPorCertificar: new Date() },
    select: { estado: true },
  });

  try {
    await sendPorCertificarEmail({ nombres: aprendiz.nombres, email: aprendiz.email });
  } catch (error) {
    console.error("[api/instructor/seguimiento] No se pudo enviar el correo de Por certificar:", error);
  }

  return NextResponse.json({ aprendiz: actualizado });
}
