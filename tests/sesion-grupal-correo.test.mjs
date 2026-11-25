// Correos de las sesiones grupales (25 nov 2026). Datos ficticios.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@/": new URL("../src/", import.meta.url).pathname } });
const { componerSesionGrupal } = await jiti.import("../src/lib/sesion-grupal-correo.ts");

const presencial = { titulo: "Momento 2 (Seguimiento)", horario: { fecha: "2026-12-02", horaInicio: "08:00", horaFin: "10:00" }, modalidad: "PRESENCIAL", lugar: "Ambiente 204", videollamadaUrl: null };
const virtual = { ...presencial, modalidad: "VIRTUAL", lugar: null, videollamadaUrl: "https://meet.example.com/abc" };

test("al aprendiz no le llegan los nombres de los demás convocados", () => {
  const c = componerSesionGrupal({ sesion: presencial, para: "APRENDIZ", aprendizNombre: "Ana Pérez", convocados: ["Ana Pérez", "Luis Gómez"] });
  assert.ok(c.text.includes("Ana Pérez"));
  assert.ok(!c.text.includes("Luis Gómez") && !c.html.includes("Luis Gómez"));
});

test("al instructor le llega la lista de convocados", () => {
  const c = componerSesionGrupal({ sesion: presencial, para: "INSTRUCTOR", convocados: ["Ana Pérez", "Luis Gómez"] });
  assert.ok(c.text.includes("Convocados (2)") && c.text.includes("Luis Gómez"));
});

test("presencial dice el lugar y no trae enlace; virtual trae el enlace", () => {
  const p = componerSesionGrupal({ sesion: presencial, para: "APRENDIZ", aprendizNombre: "Ana" });
  assert.ok(p.text.includes("Presencial, en Ambiente 204") && !p.text.includes("Unirse"));
  const v = componerSesionGrupal({ sesion: virtual, para: "APRENDIZ", aprendizNombre: "Ana" });
  assert.ok(v.text.includes("Unirse a la videollamada: https://meet.example.com/abc"));
});

test("reprogramada muestra antes y ahora; cancelada no trae enlace", () => {
  const r = componerSesionGrupal({ sesion: virtual, para: "APRENDIZ", aprendizNombre: "Ana", anterior: { fecha: "2026-12-01", horaInicio: "08:00", horaFin: "10:00" } });
  assert.ok(r.subject.startsWith("Sesión grupal reprogramada") && r.text.includes("Antes:") && r.text.includes("Ahora:"));
  const x = componerSesionGrupal({ sesion: virtual, para: "APRENDIZ", aprendizNombre: "Ana", cancelada: true });
  assert.ok(x.subject.startsWith("Sesión grupal cancelada") && !x.text.includes("Unirse"));
});
