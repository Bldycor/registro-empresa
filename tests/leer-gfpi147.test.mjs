// Pruebas del lector de la tabla de actividades de la bitácora (GFPI-F-147).
// Se corren con `npm test`. Los datos son ficticios, con las posiciones de un PDF real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@/": new URL("../src/", import.meta.url).pathname } });
const { actividadesDelDocumento } = await jiti.import("../src/lib/leer-gfpi147.ts");

const t = (s, x, y, w = 40) => ({ s, x, y, w, h: 5 });

// Encabezado de la tabla tal como lo exporta Excel; `fechas` decide qué va en las celdas de fecha.
function pagina(fechas) {
  return [
    t("Descripción de las actividades realizadas", 270, 364, 76),
    t("Descripción de la actividad", 87, 337, 51),
    t("Competencias del programa de formación aplicadas", 173, 340, 98),
    t("en el desarrollo de la actividad", 193, 334, 58),
    ...fechas,
    t("Evidencia de cumplimiento", 406, 348, 51),
    t("Observaciones, inasistencias, dificultades", 478, 343, 78),
    t("el aprendiz y/o jefe inmediato", 489, 332, 57),
    t("es el caso.", 422, 326, 19),
    // Fila 1
    t("Atender clientes en tienda", 71, 306, 84),
    t("Ventas", 197, 306, 50),
    t("01/11/2026", 293, 306, 22),
    t("15/11/2026", 350, 306, 22),
    t("Registro de ventas", 401, 306, 62),
    t("Sin novedad", 500, 306, 35),
    // Fila 2
    t("Inventario diario", 61, 290, 104),
    t("Control de inventario", 203, 290, 39),
    t("02/11/2026", 293, 290, 22),
    t("14/11/2026", 350, 290, 22),
    t("Planilla de inventario", 392, 290, 77),
    t("Actividad realizada", 500, 290, 35),
    t("Información afiliación a la ARL", 279, 225, 57),
  ];
}

const esperado = [
  { descripcion: "Atender clientes en tienda", competencias: "Ventas", fechaInicio: "01/11/2026", fechaFin: "15/11/2026", evidenciaCumplimiento: "Registro de ventas", observaciones: "Sin novedad" },
  { descripcion: "Inventario diario", competencias: "Control de inventario", fechaInicio: "02/11/2026", fechaFin: "14/11/2026", evidenciaCumplimiento: "Planilla de inventario", observaciones: "Actividad realizada" },
];

test("lee la tabla con los títulos de fecha de la plantilla", () => {
  const p = pagina([t("Fecha de inicio", 288, 340, 30), t("(dd/mm/aa)", 290, 334, 25), t("Fecha de fin", 347, 340, 28), t("(dd/mm/aa)", 349, 334, 25)]);
  assert.deepEqual(actividadesDelDocumento([p]), esperado);
});

test("lee la tabla cuando el aprendiz escribió fechas encima de los títulos de fecha (caso del 17 nov 2026)", () => {
  const p = pagina([t("01/11/2026", 293, 337, 22), t("15/11/2026", 350, 337, 22)]);
  assert.deepEqual(actividadesDelDocumento([p]), esperado);
});

test("lee la tabla cuando las celdas de título de fecha quedaron vacías", () => {
  assert.deepEqual(actividadesDelDocumento([pagina([])]), esperado);
});

test("sin la tabla de actividades no inventa filas", () => {
  assert.deepEqual(actividadesDelDocumento([[t("Bitácora N° 3", 50, 700, 60), t("Información afiliación a la ARL", 279, 225, 57)]]), []);
});
