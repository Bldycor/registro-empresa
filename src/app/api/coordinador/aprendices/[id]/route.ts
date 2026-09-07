import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { AprendizGestionSchema } from "@/lib/validations";
import { validarFechaInicioEtapaProductiva } from "@/lib/etapa-productiva-fechas";
import type { Prisma } from "@/generated/prisma/client";

const APRENDIZ_SELECT = {
  id: true,
  nombres: true,
  apellidos: true,
  cedula: true,
  email: true,
  celular: true,
  direccionResidencia: true,
  comuna: true,
  estado: true,
  alternativaEtapaProductiva: true,
  fichaId: true,
  fechaInicioEtapaProductiva: true,
  fechaFinEtapaProductiva: true,
  ficha: {
    select: {
      id: true,
      codigo: true,
      instructor: { select: { nombres: true, apellidos: true } },
    },
  },
} satisfies Prisma.UserSelect;

// Edita los datos de un aprendiz: datos personales, estado (Activo/Certificado) y asignación de
// ficha — incluye desasignarlo (fichaId → null) o reasignarlo a otra ficha existente.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.role !== "APRENDIZ") {
    return NextResponse.json({ error: { _root: ["El aprendiz no existe."] } }, { status: 404 });
  }

  const body = await request.json();
  const parsed = AprendizGestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const g = parsed.data;

  if (g.email !== undefined || g.cedula !== undefined) {
    const duplicado = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          g.email !== undefined ? { email: g.email } : undefined,
          g.cedula !== undefined ? { cedula: g.cedula } : undefined,
        ].filter(Boolean) as Prisma.UserWhereInput[],
      },
    });
    if (duplicado) {
      const field = g.email !== undefined && duplicado.email === g.email ? "email" : "cedula";
      return NextResponse.json(
        {
          error: {
            [field]: [
              field === "email"
                ? "Ya existe otra cuenta con este correo."
                : "Ya existe otra cuenta con esta cédula.",
            ],
          },
        },
        { status: 409 }
      );
    }
  }

  let fichaParaValidar: {
    fechaInicioProductiva: Date | null;
    fechaLimiteIniciarEP: Date | null;
  } | null = null;

  if (g.fichaId !== undefined) {
    if (g.fichaId) {
      const ficha = await prisma.ficha.findUnique({
        where: { id: g.fichaId },
        select: { fechaInicioProductiva: true, fechaLimiteIniciarEP: true },
      });
      if (!ficha) {
        return NextResponse.json({ error: { fichaId: ["La ficha seleccionada no existe."] } }, { status: 400 });
      }
      fichaParaValidar = ficha;
    }
  } else if (existing.fichaId) {
    fichaParaValidar = await prisma.ficha.findUnique({
      where: { id: existing.fichaId },
      select: { fechaInicioProductiva: true, fechaLimiteIniciarEP: true },
    });
  }

  if (g.fechaInicioEtapaProductiva) {
    const alternativaEfectiva =
      g.alternativaEtapaProductiva !== undefined
        ? g.alternativaEtapaProductiva
        : existing.alternativaEtapaProductiva;
    const errorFecha = validarFechaInicioEtapaProductiva({
      fechaInicioPropuesta: new Date(g.fechaInicioEtapaProductiva),
      fechaInicioProductivaFicha: fichaParaValidar?.fechaInicioProductiva ?? null,
      fechaLimiteIniciarEPFicha: fichaParaValidar?.fechaLimiteIniciarEP ?? null,
      esVinculoLaboral: alternativaEfectiva === "VINCULO_LABORAL",
    });
    if (errorFecha) {
      return NextResponse.json(
        { error: { fechaInicioEtapaProductiva: [errorFecha] } },
        { status: 400 },
      );
    }
  }

  const data: Prisma.UserUpdateInput = {};
  if (g.nombres !== undefined) data.nombres = g.nombres;
  if (g.apellidos !== undefined) data.apellidos = g.apellidos;
  if (g.cedula !== undefined) data.cedula = g.cedula;
  if (g.email !== undefined) data.email = g.email;
  if (g.celular !== undefined) data.celular = g.celular;
  if (g.direccionResidencia !== undefined) data.direccionResidencia = g.direccionResidencia;
  if (g.comuna !== undefined) data.comuna = g.comuna;
  if (g.estado !== undefined) data.estado = g.estado;
  if (g.alternativaEtapaProductiva !== undefined) {
    data.alternativaEtapaProductiva = g.alternativaEtapaProductiva;
  }
  if (g.fichaId !== undefined) {
    data.ficha = g.fichaId ? { connect: { id: g.fichaId } } : { disconnect: true };
  }
  if (g.fechaInicioEtapaProductiva !== undefined) {
    data.fechaInicioEtapaProductiva = g.fechaInicioEtapaProductiva
      ? new Date(g.fechaInicioEtapaProductiva)
      : null;
  }
  if (g.fechaFinEtapaProductiva !== undefined) {
    data.fechaFinEtapaProductiva = g.fechaFinEtapaProductiva ? new Date(g.fechaFinEtapaProductiva) : null;
  }

  const aprendiz = await prisma.user.update({
    where: { id },
    data,
    select: APRENDIZ_SELECT,
  });

  return NextResponse.json({ aprendiz });
}

// Elimina la cuenta del aprendiz por completo: a diferencia de eliminar una ficha o un
// instructor, acá SÍ se borra todo lo que dependía de él (perfil de empresa, concertación,
// evaluaciones, bitácoras, certificación del empresario — todas en cascada por diseño del
// esquema), porque son evidencias del propio aprendiz, no de un tercero. Irreversible.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existing || existing.role !== "APRENDIZ") {
    return NextResponse.json({ error: "El aprendiz no existe." }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
