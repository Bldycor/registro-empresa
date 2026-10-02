// División político-administrativa de Colombia: los 32 departamentos y Bogotá D.C., y sus
// municipios con el código DIVIPOLA del DANE (src/lib/colombia-municipios.ts, generado desde Datos
// Abiertos Colombia). Departamento y municipio se eligen siempre de estas listas —nunca se
// escriben a mano— para que todos los registros digan lo mismo (decisión del 2 oct 2026).
import { MUNICIPIOS_POR_DEPARTAMENTO } from "@/lib/colombia-municipios";

export { MUNICIPIOS_POR_DEPARTAMENTO };

export const DEPARTAMENTOS = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Archipiélago de San Andrés, Providencia y Santa Catalina",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
] as const;

export type Departamento = (typeof DEPARTAMENTOS)[number];

// Para aceptar el departamento como lo escriba la gente en una hoja de cálculo —«antioquia»,
// «ANTIOQUIA», «Bogota»—, y guardarlo siempre con el nombre oficial.
function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function departamentoOficial(texto: string): Departamento | null {
  const buscado = sinTildes(texto);
  if (!buscado) return null;
  const exacto = DEPARTAMENTOS.find((d) => sinTildes(d) === buscado);
  if (exacto) return exacto;
  // Formas cortas frecuentes.
  if (buscado === "bogota" || buscado === "bogota dc" || buscado === "bogota d.c") return "Bogotá D.C.";
  if (buscado === "san andres") return "Archipiélago de San Andrés, Providencia y Santa Catalina";
  if (buscado === "valle") return "Valle del Cauca";
  return null;
}

// Municipio con su nombre oficial dentro de un departamento, aceptando cómo lo escriba la gente en
// una hoja de cálculo («medellin», «MEDELLÍN»). Si no es de ese departamento, no se acepta.
export function municipioOficial(departamento: string, texto: string): string | null {
  const lista = MUNICIPIOS_POR_DEPARTAMENTO[departamento];
  if (!lista) return null;
  const buscado = sinTildes(texto);
  if (!buscado) return null;
  return lista.find((m) => sinTildes(m.nombre) === buscado)?.nombre ?? null;
}
