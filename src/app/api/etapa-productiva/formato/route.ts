import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { FormatoEPSchema } from "@/lib/validations";
import { construirFormato } from "@/lib/formato-gfpi023";
import { fechaEnColombia } from "@/lib/plazos-institucionales";
import { leerFormato, type DatosDocumento } from "@/lib/leer-gfpi023";
import { filasDesdeDocumento, textoDesdeFilas } from "@/lib/competencia-catalogo";
import { catalogoDelAprendiz, problemaEnPlan } from "@/lib/competencias-validas";

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

// Las fechas del documento vienen como D/M/AAAA. Si no se entiende, se ignora: no se adivina.
function fechaDelDocumento(valor: string | null | undefined): Date | null {
  const m = (valor ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, d, mes, anio] = m;
  const año = anio.length === 2 ? 2000 + Number(anio) : Number(anio);
  const fecha = new Date(Date.UTC(año, Number(mes) - 1, Number(d)));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
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

// «Virtual», «remota», «Teams»… → VIRTUAL; «Presencial» → PRESENCIAL. Lo demás no se adivina.
function modalidadDelDocumento(texto: string | null | undefined): "PRESENCIAL" | "VIRTUAL" | null {
  const t = (texto ?? "").toLowerCase();
  if (/presencial/.test(t)) return "PRESENCIAL";
  if (/virtual|remot|teams|meet|zoom/.test(t)) return "VIRTUAL";
  return null;
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

  // Si viene un formato adjunto nuevo, se lee y se guarda lo que traiga: es la forma de no hacerle
  // escribir al aprendiz lo que ya está en el documento firmado. Si el PDF es un escaneo sin texto
  // —o si algo falla al leerlo— no pasa nada: el formato sigue su curso con lo que ya había.
  const archivoNuevo = (m.archivoUrl ?? "").trim();
  let lectura: { leidos: number; sinTexto: boolean } | null = null;
  let datosDocumento: Partial<DatosDocumento> | null = null;

  if (archivoNuevo) {
    const previo = await prisma.datosFormatoEP.findUnique({
      where: { userId: user.id },
      select: { datosDocumento: true },
    });
    try {
      const respuesta = await fetch(archivoNuevo);
      if (respuesta.ok) {
        const leido = await leerFormato(await respuesta.arrayBuffer(), m.momento);
        lectura = { leidos: leido.leidos, sinTexto: leido.sinTexto };
        if (leido.leidos > 0) {
          // Lo nuevo se suma a lo leído antes en otro momento, sin borrarlo.
          datosDocumento = { ...((previo?.datosDocumento as Partial<DatosDocumento>) ?? {}), ...leido.datos };
        }
      }
    } catch (error) {
      console.error("[formato] No se pudo leer el PDF adjunto:", error);
    }
  }

  if (datos || datosDocumento) {
    const escrito = {
      regional: limpiar(datos?.regional),
      centroFormacion: limpiar(datos?.centroFormacion),
      estrategiaFormativa: limpiar(datos?.estrategiaFormativa),
      correoInstitucional: limpiar(datos?.correoInstitucional),
      nitEmpresa: limpiar(datos?.nitEmpresa),
      asistenciaNombre: limpiar(datos?.asistenciaNombre),
      asistenciaTipo: limpiar(datos?.asistenciaTipo),
      asistenciaContacto: limpiar(datos?.asistenciaContacto),
    };
    // Lo leído del PDF solo entra donde el aprendiz no escribió nada.
    const valores = {
      ...escrito,
      correoInstitucional: escrito.correoInstitucional ?? datosDocumento?.correoInstitucional ?? null,
      nitEmpresa: escrito.nitEmpresa ?? datosDocumento?.nitEmpresa ?? null,
      ...(datosDocumento ? { datosDocumento, documentoLeidoEn: new Date() } : {}),
    };
    await prisma.datosFormatoEP.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...valores },
      update: valores,
    });
  }

  // Momento que se hizo por fuera de SEPA: el aprendiz registra el día real y queda como
  // constancia, sin citación —la reunión ya ocurrió—. Una fecha futura no se acepta por acá: esa
  // se agenda por el camino normal, que sí avisa a todos.
  const hoy = fechaEnColombia(new Date());
  const fechaRealizado = (m.fechaRealizado ?? "").trim();
  const horaInicio = (m.horaInicio ?? "").trim() || "00:00";
  const horaFin = (m.horaFin ?? "").trim() || "00:00";

  function faltaRegistro(momento: number) {
    if (!fechaRealizado) {
      return NextResponse.json(
        {
          error: {
            fechaRealizado: [
              `Ese momento no está agendado en SEPA. Si ya se hizo, escribe el día en que ocurrió; si todavía no, agéndalo arriba para que salga la citación.`,
            ],
          },
        },
        { status: 400 },
      );
    }
    if (fechaRealizado > hoy) {
      return NextResponse.json(
        {
          error: {
            fechaRealizado: [
              `Esa fecha es futura: agenda el Momento ${momento} arriba para que salga la citación a tu instructor y a tu coformador.`,
            ],
          },
        },
        { status: 400 },
      );
    }
    return null;
  }

  if (m.momento === 1) {
    let concertacion = await prisma.concertacionFuncion.findUnique({
      where: { userId: user.id },
      select: { id: true, estado: true, competenciasDesarrollar: true, resultadosAprendizaje: true },
    });
    if (!concertacion) {
      const problema = faltaRegistro(1);
      if (problema) return problema;
      concertacion = await prisma.concertacionFuncion.create({
        data: {
          userId: user.id,
          fecha: toDateOnly(fechaRealizado),
          horaInicio,
          horaFin,
        },
        select: { id: true, estado: true, competenciasDesarrollar: true, resultadosAprendizaje: true },
      });
    }
    // Una vez avalado, el formato es el que revisó el instructor: no se reescribe.
    if (concertacion.estado === "APROBADA") {
      return NextResponse.json(
        { error: { _root: ["Tu instructor ya avaló este momento: el formato queda como quedó."] } },
        { status: 409 },
      );
    }

    // Si el programa de la ficha tiene catálogo, competencias y resultados salen de él: lo leído
    // del PDF se casa con el catálogo y solo entra lo que coincide, nunca el texto crudo.
    const programa = (
      await prisma.user.findUnique({ where: { id: user.id }, select: { ficha: { select: { programa: true } } } })
    )?.ficha?.programa;
    const catalogo = programa
      ? await prisma.competenciaFormacion.findMany({
          where: { programa },
          select: { id: true, tipo: true, nombreCompetencia: true, resultadoAprendizaje: true },
        })
      : [];
    let competenciasLeidas: string | null = null;
    let resultadosLeidos: string | null = null;
    if (catalogo.length > 0) {
      competenciasLeidas = datosDocumento?.competenciasDesarrollar ?? null;
      resultadosLeidos = datosDocumento?.resultadosAprendizaje ?? null;
      const texto = textoDesdeFilas(
        filasDesdeDocumento(competenciasLeidas ?? "", resultadosLeidos ?? "", catalogo),
      );
      competenciasLeidas = texto.competencias || null;
      resultadosLeidos = texto.resultados || null;
    }

    const problema = problemaEnPlan(
      await catalogoDelAprendiz(user.id),
      limpiar(m.competenciasDesarrollar) ?? competenciasLeidas,
      limpiar(m.resultadosAprendizaje) ?? resultadosLeidos,
      { competencias: concertacion.competenciasDesarrollar, resultados: concertacion.resultadosAprendizaje },
    );
    if (problema) {
      return NextResponse.json({ error: { _root: [problema] } }, { status: 400 });
    }

    await prisma.concertacionFuncion.update({
      where: { userId: user.id },
      data: {
        competenciasDesarrollar: limpiar(m.competenciasDesarrollar) ?? competenciasLeidas,
        resultadosAprendizaje: limpiar(m.resultadosAprendizaje) ?? resultadosLeidos,
        actividadesDesarrollar: limpiar(m.actividadesDesarrollar) ?? datosDocumento?.actividadesDesarrollar ?? null,
        evidenciasAprendizaje: limpiar(m.evidenciasAprendizaje) ?? datosDocumento?.evidenciasAprendizaje ?? null,
        observacionesAdicionales: limpiar(m.observacionesAdicionales) ?? datosDocumento?.observacionesAdicionales ?? null,
        arlFechaAfiliacion: m.arlFechaAfiliacion
          ? toDateOnly(m.arlFechaAfiliacion)
          : fechaDelDocumento(datosDocumento?.arlFechaAfiliacion),
        arlNumeroPoliza: limpiar(m.arlNumeroPoliza) ?? datosDocumento?.arlNumeroPoliza ?? null,
        horario: limpiar(m.horario) ?? datosDocumento?.horario ?? null,
        // Lo que el aprendiz escribe manda; si no escribió nada, lo leído del PDF.
        enlaceGrabacion: limpiar(m.enlaceGrabacion) ?? datosDocumento?.enlaceGrabacion ?? undefined,
        archivoUrl: limpiar(m.archivoUrl),
      },
    });
  } else {
    let evaluacion = await prisma.evaluacion.findFirst({
      where: { userId: user.id, numero: m.momento, esExtraordinario: false },
      select: { id: true, estado: true, fecha: true, modalidad: true },
    });
    if (!evaluacion) {
      const problema = faltaRegistro(m.momento);
      if (problema) return problema;
      evaluacion = await prisma.evaluacion.create({
        data: {
          userId: user.id,
          numero: m.momento,
          esExtraordinario: false,
          fecha: toDateOnly(fechaRealizado),
          horaInicio,
          horaFin,
        },
        select: { id: true, estado: true, fecha: true, modalidad: true },
      });
    }
    if (evaluacion.estado === "APROBADA") {
      return NextResponse.json(
        { error: { _root: ["Tu instructor ya cerró este momento: el formato queda como quedó."] } },
        { status: 409 },
      );
    }

    // Un momento registrado sin día (raro, pero pasa) toma el que escriba el aprendiz, siempre
    // que no sea futuro. Un día ya registrado no se cambia desde aquí: se reprograma.
    if (!evaluacion.fecha && fechaRealizado) {
      if (fechaRealizado > hoy) return faltaRegistro(m.momento)!;
    }
    // Modalidad: la que elija el aprendiz; si no eligió y el momento no la tiene, la del PDF.
    const modalidad =
      m.modalidad || (!evaluacion.modalidad ? modalidadDelDocumento(datosDocumento?.modalidadMomento) : null);

    await prisma.evaluacion.update({
      where: { id: evaluacion.id },
      data: {
        retroalimentacionAprendiz: limpiar(m.retroalimentacionAprendiz),
        archivoUrl: limpiar(m.archivoUrl),
        fecha: !evaluacion.fecha && fechaRealizado ? toDateOnly(fechaRealizado) : undefined,
        modalidad: modalidad ?? undefined,
        enlaceGrabacion: limpiar(m.enlaceGrabacion) ?? datosDocumento?.enlaceGrabacion ?? undefined,
        numeroVisitas:
          m.momento === 3 && datosDocumento?.numeroVisitas
            ? Number(datosDocumento.numeroVisitas)
            : undefined,
      },
    });
  }

  const formato = await construirFormato(user.id, m.momento);
  return NextResponse.json({ formato, lectura });
}
