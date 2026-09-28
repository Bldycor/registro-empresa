import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { FormatoEPSchema } from "@/lib/validations";
import { construirFormato } from "@/lib/formato-gfpi023";

// Formato GFPI-F-023 del aprendiz, momento por momento: lo que el sistema ya sabe más lo que él
// diligencia, para revisarlo antes de enviarlo y adjuntar el PDF firmado.
//
// Enviar NO dispara correos: el formato y su adjunto quedan como evidencia del momento para que el
// instructor los revise, igual que Alternativa EP y Formalización (decisión de Coordinación,
// 28 sep 2026).

function momentoValido(valor: string | null): valor is "1" | "2" | "3" {
  return valor === "1" || valor === "2" || valor === "3";
}

function toDateOnly(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const crudo = new URL(request.url).searchParams.get("momento");
  if (!momentoValido(crudo)) {
    return NextResponse.json({ error: "Momento inválido." }, { status: 400 });
  }

  const formato = await construirFormato(user.id, Number(crudo) as 1 | 2 | 3);
  if (!formato) {
    return NextResponse.json({ error: "No se encontró el aprendiz." }, { status: 404 });
  }

  const datos = await prisma.datosFormatoEP.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ formato, datos });
}

export async function PATCH(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const parsed = FormatoEPSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { datos, momento: m } = parsed.data;

  // Lo que el aprendiz deje en blanco se guarda como vacío: el formato lo mostrará sin rellenar.
  const limpiar = (v: string | null | undefined) => (v ?? "").trim() || null;

  if (datos) {
    const valores = {
      regional: limpiar(datos.regional),
      centroFormacion: limpiar(datos.centroFormacion),
      estrategiaFormativa: limpiar(datos.estrategiaFormativa),
      correoInstitucional: limpiar(datos.correoInstitucional),
      nitEmpresa: limpiar(datos.nitEmpresa),
      asistenciaNombre: limpiar(datos.asistenciaNombre),
      asistenciaTipo: limpiar(datos.asistenciaTipo),
      asistenciaContacto: limpiar(datos.asistenciaContacto),
    };
    await prisma.datosFormatoEP.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...valores },
      update: valores,
    });
  }

  if (m.momento === 1) {
    const concertacion = await prisma.concertacionFuncion.findUnique({
      where: { userId: user.id },
      select: { id: true, estado: true },
    });
    if (!concertacion) {
      return NextResponse.json(
        { error: { _root: ["Primero agenda el Momento 1 para poder diligenciar su formato."] } },
        { status: 409 },
      );
    }
    // Una vez avalado, el formato es el que revisó el instructor: no se reescribe.
    if (concertacion.estado === "APROBADA") {
      return NextResponse.json(
        { error: { _root: ["Tu instructor ya avaló este momento: el formato queda como quedó."] } },
        { status: 409 },
      );
    }

    await prisma.concertacionFuncion.update({
      where: { userId: user.id },
      data: {
        competenciasDesarrollar: limpiar(m.competenciasDesarrollar),
        resultadosAprendizaje: limpiar(m.resultadosAprendizaje),
        actividadesDesarrollar: limpiar(m.actividadesDesarrollar),
        evidenciasAprendizaje: limpiar(m.evidenciasAprendizaje),
        observacionesAdicionales: limpiar(m.observacionesAdicionales),
        arlFechaAfiliacion: m.arlFechaAfiliacion ? toDateOnly(m.arlFechaAfiliacion) : null,
        arlNumeroPoliza: limpiar(m.arlNumeroPoliza),
        horario: limpiar(m.horario),
        archivoUrl: limpiar(m.archivoUrl),
      },
    });
  } else {
    const evaluacion = await prisma.evaluacion.findFirst({
      where: { userId: user.id, numero: m.momento, esExtraordinario: false },
      select: { id: true, estado: true },
    });
    if (!evaluacion) {
      return NextResponse.json(
        { error: { _root: [`Primero agenda el Momento ${m.momento} para poder diligenciar su formato.`] } },
        { status: 409 },
      );
    }
    if (evaluacion.estado === "APROBADA") {
      return NextResponse.json(
        { error: { _root: ["Tu instructor ya cerró este momento: el formato queda como quedó."] } },
        { status: 409 },
      );
    }

    await prisma.evaluacion.update({
      where: { id: evaluacion.id },
      data: {
        retroalimentacionAprendiz: limpiar(m.retroalimentacionAprendiz),
        archivoUrl: limpiar(m.archivoUrl),
      },
    });
  }

  const formato = await construirFormato(user.id, m.momento);
  return NextResponse.json({ formato });
}
