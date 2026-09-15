import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { calcularFechaFinConTiempoPrevio } from "@/lib/etapa-productiva-fechas";
import { evaluarRequisitosAval, requisitosPendientes } from "@/lib/requisitos-aval";
import { fechaEnColombia } from "@/lib/plazos-institucionales";
import { z } from "zod";

const AvalSchema = z.object({
  estado: z.enum(["APROBADA", "RECHAZADA"]),
  observacionesAval: z.string().trim().nullable().optional(),
  // Constancia obligatoria cuando se avala con requisitos de §9.1.1 sin verificar o incumplidos.
  requisitosOmitidos: z.string().trim().max(500).nullable().optional(),
});

const RegistroSofiaPlusSchema = z.object({
  registroSofiaPlus: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha de registro en SofiaPlus.")
    .nullable(),
});

// Avala o rechaza una solicitud de selección/modificación de alternativa. Al aprobar, sincroniza
// los campos vigentes del aprendiz (alternativa, subtipo y fechas de Etapa Productiva) — son la
// única fuente de esos campos en User, nunca se editan directamente en otro formulario.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.seleccionAlternativaEP.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
  }

  const body = await request.json();

  // ---- Constancia de registro en SofiaPlus ---------------------------------------------------
  // La guía GFPI-G-040 §9.1.2 da 8 días hábiles desde el aval para registrar la alternativa en
  // SofiaPlus. SEPA no se conecta con SofiaPlus, así que Coordinación anota aquí la fecha en que
  // lo hizo: queda la constancia y se puede medir si fue a tiempo. `null` deshace un registro
  // anotado por error.
  if ("registroSofiaPlus" in body) {
    if (existing.estado !== "APROBADA") {
      return NextResponse.json(
        { error: "Solo se registra en SofiaPlus una alternativa ya avalada." },
        { status: 409 },
      );
    }
    const parsedRegistro = RegistroSofiaPlusSchema.safeParse(body);
    if (!parsedRegistro.success) {
      return NextResponse.json(
        { error: parsedRegistro.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const valor = parsedRegistro.data.registroSofiaPlus;
    const fecha = valor ? new Date(`${valor}T00:00:00.000Z`) : null;

    // Se compara como día de calendario en Colombia ("YYYY-MM-DD" contra "YYYY-MM-DD"), no en
    // UTC — ver `fechaEnColombia`.
    if (valor) {
      if (valor > fechaEnColombia(new Date())) {
        return NextResponse.json(
          { error: { registroSofiaPlus: ["La fecha de registro no puede ser futura."] } },
          { status: 400 },
        );
      }
      if (existing.fechaAval && valor < fechaEnColombia(existing.fechaAval)) {
        return NextResponse.json(
          {
            error: {
              registroSofiaPlus: ["No puede registrarse en SofiaPlus antes de haberse avalado."],
            },
          },
          { status: 400 },
        );
      }
    }

    const seleccion = await prisma.seleccionAlternativaEP.update({
      where: { id },
      data: { registroSofiaPlus: fecha },
    });
    return NextResponse.json({ seleccion });
  }

  const parsed = AvalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  // Requisitos de §9.1.1: advierten, no bloquean — pero avalar con alguno sin resolver exige
  // escribir por qué, y esa constancia queda en la solicitud. Ver src/lib/requisitos-aval.ts.
  if (d.estado === "APROBADA") {
    const aprendiz = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: {
        rapsEtapaLectivaAprobados: true,
        fechaNacimiento: true,
        autorizacionMinTrabajoUrl: true,
        concertacionFuncion: { select: { arlFechaAfiliacion: true } },
      },
    });
    const pendientes = requisitosPendientes(
      evaluarRequisitosAval({
        rapsEtapaLectivaAprobados: aprendiz?.rapsEtapaLectivaAprobados ?? null,
        fechaNacimiento: aprendiz?.fechaNacimiento ?? null,
        autorizacionMinTrabajoUrl: aprendiz?.autorizacionMinTrabajoUrl ?? null,
        fechaInicioPropuesta: existing.fechaInicioEjecucion,
        arlFechaAfiliacion: aprendiz?.concertacionFuncion?.arlFechaAfiliacion ?? null,
      }),
    );
    if (pendientes.length > 0 && !d.requisitosOmitidos?.trim()) {
      return NextResponse.json(
        {
          error: {
            requisitosOmitidos: [
              `Falta resolver: ${pendientes.map((r) => r.etiqueta).join(", ")}. Escribe la razón por la que avalas de todas formas.`,
            ],
          },
          requisitosPendientes: pendientes,
        },
        { status: 400 },
      );
    }
  }

  const seleccion = await prisma.$transaction(async (tx) => {
    const updated = await tx.seleccionAlternativaEP.update({
      where: { id },
      data: {
        estado: d.estado,
        avaladoPorId: user.id,
        fechaAval: new Date(),
        observacionesAval: d.observacionesAval ?? null,
        requisitosOmitidos: d.requisitosOmitidos?.trim() || null,
      },
    });

    if (d.estado === "APROBADA") {
      const aprendiz = await tx.user.findUnique({
        where: { id: updated.userId },
        select: { estado: true, diasEjecutadosPrevios: true },
      });
      const diasPrevios = aprendiz?.diasEjecutadosPrevios ?? 0;

      // Si el aprendiz ya ejecutó tiempo en una alternativa que interrumpió, el tramo nuevo solo
      // cubre lo que le falta para completar los 180 días del diseño curricular — guía
      // GFPI-G-040 §9.3.1: el tiempo ya cumplido "sea contabilizado y sumado a la nueva opción".
      // La fecha fin que venga en la solicitud se respeta solo cuando no hay tiempo previo.
      const fechaFin =
        diasPrevios > 0 && updated.fechaInicioEjecucion
          ? calcularFechaFinConTiempoPrevio(updated.fechaInicioEjecucion, diasPrevios)
          : updated.fechaFinEjecucion;

      await tx.user.update({
        where: { id: updated.userId },
        data: {
          alternativaEtapaProductiva: updated.alternativa,
          subtipoAlternativaEtapaProductiva: updated.subtipoAlternativa,
          fechaInicioEtapaProductiva: updated.fechaInicioEjecucion,
          fechaFinEtapaProductiva: fechaFin,
          // Avalar la nueva alternativa es lo que reanuda la práctica interrumpida.
          ...(aprendiz?.estado === "PRACTICA_INTERRUMPIDA" ? { estado: "ACTIVO" as const } : {}),
        },
      });
    }

    return updated;
  });

  return NextResponse.json({ seleccion });
}
