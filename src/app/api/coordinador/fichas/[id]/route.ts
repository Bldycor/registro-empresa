import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { FichaGestionSchema } from "@/lib/validations";
import { calcularFechasFicha } from "@/lib/ficha-fechas";
import type { Prisma } from "@/generated/prisma/client";

const FICHA_SELECT = {
  id: true,
  codigo: true,
  programa: true,
  estado: true,
  nivelFormacion: true,
  jornada: true,
  fechaInicioFicha: true,
  fechaInicioProductiva: true,
  fechaFinFormacion: true,
  fechaLimiteIniciarEP: true,
  instructorId: true,
  instructor: { select: { id: true, nombres: true, apellidos: true, email: true } },
} satisfies Prisma.FichaSelect;

type ResultadoFecha = { presente: false } | { presente: true; valor: Date | null };

// Distingue explícitamente "el campo no vino en la petición" (no tocar) de "vino vacío/null"
// (limpiar la fecha) de "vino con un valor que no se pudo interpretar" (error 400).
function leerFecha(valor: string | null | undefined): ResultadoFecha | null {
  if (valor === undefined) return { presente: false };
  if (valor === null || valor.trim() === "") return { presente: true, valor: null };
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : { presente: true, valor: fecha };
}

// Edita los datos de gestión de una ficha (estado, nivel, jornada, fechas institucionales —
// migrados desde el control en hoja de cálculo) y/o asigna el instructor autorizado para
// evaluarla. Cada ficha tiene a lo sumo un instructor; un instructor puede tener varias fichas
// (ver docs/PLAN-IMPLEMENTACION.md, Fase 1).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR"]);
  if (!user) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const ficha = await prisma.ficha.findUnique({ where: { id } });
  if (!ficha) {
    return NextResponse.json({ error: "La ficha no existe." }, { status: 404 });
  }

  const data: Prisma.FichaUpdateInput = {};

  if ("instructorId" in body) {
    const instructorId: string | null = body.instructorId ?? null;
    if (instructorId) {
      const instructor = await prisma.user.findUnique({ where: { id: instructorId } });
      if (!instructor || instructor.role !== "INSTRUCTOR") {
        return NextResponse.json(
          { error: "El usuario seleccionado no es un instructor válido." },
          { status: 400 }
        );
      }
    }
    data.instructor = instructorId ? { connect: { id: instructorId } } : { disconnect: true };
  }

  if ("gestion" in body) {
    const parsed = FichaGestionSchema.safeParse(body.gestion);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const g = parsed.data;

    if (g.estado !== undefined) data.estado = g.estado;
    if (g.nivelFormacion !== undefined) data.nivelFormacion = g.nivelFormacion;
    if (g.jornada !== undefined) data.jornada = g.jornada;

    let fechaInicioFicha = ficha.fechaInicioFicha;
    let fechaFinFormacion = ficha.fechaFinFormacion;

    const resultadoInicioFicha = leerFecha(g.fechaInicioFicha);
    if (resultadoInicioFicha === null) {
      return NextResponse.json({ error: { fechaInicioFicha: ["Fecha inválida."] } }, { status: 400 });
    }
    if (resultadoInicioFicha.presente) {
      fechaInicioFicha = resultadoInicioFicha.valor;
      data.fechaInicioFicha = fechaInicioFicha;
    }

    const resultadoFinFormacion = leerFecha(g.fechaFinFormacion);
    if (resultadoFinFormacion === null) {
      return NextResponse.json({ error: { fechaFinFormacion: ["Fecha inválida."] } }, { status: 400 });
    }
    if (resultadoFinFormacion.presente) {
      fechaFinFormacion = resultadoFinFormacion.valor;
      data.fechaFinFormacion = fechaFinFormacion;
    }

    // fechaInicioProductiva y fechaLimiteIniciarEP se recalculan siempre con la fórmula oficial
    // (src/lib/ficha-fechas.ts), a partir del nivel de formación y las fechas ya resueltas arriba
    // (las que llegaron en esta petición, o si no, las que ya tenía la ficha).
    const nivelFormacion = g.nivelFormacion !== undefined ? g.nivelFormacion : ficha.nivelFormacion;
    const { fechaInicioProductiva, fechaLimiteIniciarEP } = calcularFechasFicha({
      nivelFormacion,
      fechaInicioFicha,
      fechaFinFormacion,
    });
    data.fechaInicioProductiva = fechaInicioProductiva;
    data.fechaLimiteIniciarEP = fechaLimiteIniciarEP;
  }

  const actualizada = await prisma.ficha.update({
    where: { id },
    data,
    select: FICHA_SELECT,
  });

  return NextResponse.json({ ficha: actualizada });
}

// Elimina la ficha y todos sus datos de gestión (estado, fechas, etc.). Los aprendices que la
// tenían asignada NO se borran — solo quedan sin ficha (fichaId a null); sus cuentas, login y
// evaluaciones/bitácoras se conservan intactas. Confirmado explícitamente por el coordinador
// (ver docs/PLAN-IMPLEMENTACION.md): borrar cuentas de aprendices es un riesgo que no se asume
// implícitamente al borrar una ficha.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR"]);
  if (!user) return response;

  const { id } = await params;

  const ficha = await prisma.ficha.findUnique({ where: { id }, select: { id: true } });
  if (!ficha) {
    return NextResponse.json({ error: "La ficha no existe." }, { status: 404 });
  }

  const [{ count: aprendicesDesvinculados }] = await prisma.$transaction([
    prisma.user.updateMany({ where: { fichaId: id }, data: { fichaId: null } }),
    prisma.ficha.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true, aprendicesDesvinculados });
}
