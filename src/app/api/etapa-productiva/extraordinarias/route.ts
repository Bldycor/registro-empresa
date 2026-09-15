import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { NUMERO_REUNION_EXTRAORDINARIA, ReunionExtraordinariaSchema } from "@/lib/validations";
import { rangesOverlap } from "@/lib/time";
import { ocupaFranja } from "@/lib/reuniones";
import { sendSolicitudExtraordinariaEmail } from "@/lib/mailer";

const REUNION_SELECT = {
  id: true,
  fecha: true,
  horaInicio: true,
  horaFin: true,
  modalidad: true,
  motivoExtraordinario: true,
  solicitadaPor: true,
  estado: true,
  observaciones: true,
  videollamadaUrl: true,
  fechaAval: true,
  createdAt: true,
} as const;

function toDateOnly(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

// Reuniones extraordinarias del propio aprendiz (requisito §3.2).
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const reuniones = await prisma.evaluacion.findMany({
    where: { userId: user.id, esExtraordinario: true },
    select: REUNION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reuniones });
}

// El aprendiz propone una reunión extraordinaria —a nombre propio o de su coformador— con fecha,
// franja y motivo. Queda por aprobar: al instructor le llega la solicitud, y la citación con el
// enlace a todos sale solo cuando la aprueba (decisión de Coordinación). La franja queda
// reservada desde ya, para que nadie más la tome mientras el instructor responde.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = ReunionExtraordinariaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const aprendiz = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      nombres: true,
      apellidos: true,
      estado: true,
      ficha: { select: { instructorId: true, instructor: { select: { email: true } } } },
      evaluaciones: {
        where: { esExtraordinario: true, estado: "PENDIENTE" },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!aprendiz) {
    return NextResponse.json({ error: { _root: ["Usuario no encontrado."] } }, { status: 404 });
  }
  if (aprendiz.estado === "CERTIFICADO" || aprendiz.estado === "DESERTADO") {
    return NextResponse.json(
      { error: { _root: ["Tu proceso ya está cerrado: no se pueden pedir más reuniones."] } },
      { status: 409 },
    );
  }
  const instructorId = aprendiz.ficha?.instructorId;
  const instructorEmail = aprendiz.ficha?.instructor?.email;
  if (!instructorId || !instructorEmail) {
    return NextResponse.json(
      { error: { _root: ["Tu ficha todavía no tiene un instructor asignado."] } },
      { status: 409 },
    );
  }
  if (aprendiz.evaluaciones.length > 0) {
    return NextResponse.json(
      {
        error: {
          _root: [
            "Ya tienes una solicitud pendiente de aprobación. Espera la respuesta de tu instructor o retírala para proponer otra.",
          ],
        },
      },
      { status: 409 },
    );
  }

  const fechaDate = toDateOnly(d.fecha);
  // Choque con cualquier reunión del instructor ese día, incluidas las del propio aprendiz: es una
  // reunión nueva, no la reprogramación de una que ya exista.
  const reunionesDelDia = await prisma.evaluacion.findMany({
    where: { fecha: fechaDate, user: { ficha: { instructorId } }, AND: [ocupaFranja] },
    select: { horaInicio: true, horaFin: true },
  });
  const hayConflicto = reunionesDelDia.some(
    (r) => r.horaInicio && r.horaFin && rangesOverlap(d.horaInicio, d.horaFin, r.horaInicio, r.horaFin),
  );
  if (hayConflicto) {
    return NextResponse.json(
      { error: { horaInicio: ["Tu instructor ya tiene otra reunión que se cruza con esa franja."] } },
      { status: 409 },
    );
  }

  const reunion = await prisma.evaluacion.create({
    data: {
      userId: user.id,
      numero: NUMERO_REUNION_EXTRAORDINARIA,
      esExtraordinario: true,
      motivoExtraordinario: d.motivo,
      solicitadaPor: d.solicitadaPor,
      fecha: fechaDate,
      horaInicio: d.horaInicio,
      horaFin: d.horaFin,
      modalidad: d.modalidad,
    },
    select: REUNION_SELECT,
  });

  try {
    await sendSolicitudExtraordinariaEmail({
      instructorEmail,
      aprendizNombre: `${aprendiz.nombres} ${aprendiz.apellidos}`,
      horario: { fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin },
      motivo: d.motivo,
      solicitadaPor: d.solicitadaPor,
    });
  } catch (err) {
    console.error("[extraordinarias] No se pudo avisar al instructor de la solicitud:", err);
  }

  return NextResponse.json({ reunion }, { status: 201 });
}
