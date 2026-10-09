import { prisma } from "@/lib/prisma";
import { validarNit } from "@/lib/nit";
import { departamentoOficial, municipioOficial } from "@/lib/colombia";

// Catálogo de empresas co-formadoras (decisión de Coordinación, 2 oct 2026):
// - Una empresa = un NIT. Varios aprendices pueden estar en la misma empresa.
// - El administrador y Coordinación crean y editan empresas y sus sucursales (9 oct 2026): un
//   mismo NIT puede tener varias sedes, y cada aprendiz elige la suya.
// - El aprendiz elige la suya por NIT; si no está registrada, no puede guardar su perfil de
//   empresa hasta que el administrador la registre.
//
// Los perfiles de los aprendices guardan una COPIA del nombre, la dirección y el NIT de su
// empresa: así todo lo que ya los leía —reportes, formato GFPI-F-023, citaciones, expediente—
// sigue funcionando sin cambios. Esta función mantiene esa copia al día cada vez que la empresa
// cambia, para que el catálogo sea la única fuente.
export async function sincronizarPerfiles(empresaId: string) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { nombre: true, direccion: true, nit: true, sucursales: { select: { id: true, direccion: true } } },
  });
  if (!empresa) return 0;

  // Nombre y NIT son los de la empresa para todos; la dirección, la de la sede de cada aprendiz
  // (9 oct 2026: un NIT puede tener varias sucursales).
  const { count } = await prisma.companyProfile.updateMany({
    where: { empresaId },
    data: { empresaPatrocinadora: empresa.nombre, nitEmpresa: empresa.nit },
  });
  await prisma.companyProfile.updateMany({
    where: { empresaId, sucursalId: null },
    data: { direccionEmpresa: empresa.direccion },
  });
  for (const s of empresa.sucursales) {
    await prisma.companyProfile.updateMany({ where: { sucursalId: s.id }, data: { direccionEmpresa: s.direccion } });
  }
  return count;
}

// Sucursal de una empresa: nombre, dirección y ubicación oficial (mismas listas del DANE).
export type SucursalValida = { nombre: string; direccion: string; departamento: string; municipio: string };

export function validarSucursal(entrada: {
  nombre?: string;
  direccion?: string;
  departamento?: string;
  municipio?: string;
}): { ok: true; sucursal: SucursalValida } | { ok: false; errores: Record<string, string> } {
  const errores: Record<string, string> = {};
  const nombre = (entrada.nombre ?? "").replace(/\s+/g, " ").trim();
  if (nombre.length < 2) errores.nombre = "Escribe el nombre de la sucursal (por ejemplo, «Sede Bello» o «Planta norte»).";
  if (/^sede principal$/i.test(nombre)) errores.nombre = "«Sede principal» es la dirección de la empresa: usa otro nombre.";
  const direccion = (entrada.direccion ?? "").replace(/\s+/g, " ").trim();
  if (direccion.length < 5) errores.direccion = "Falta la dirección de la sucursal.";
  const departamento = departamentoOficial(entrada.departamento ?? "");
  if (!departamento) errores.departamento = "Elige el departamento.";
  const municipioEscrito = (entrada.municipio ?? "").replace(/\s+/g, " ").trim();
  const municipio = departamento ? municipioOficial(departamento, municipioEscrito) : null;
  if (!municipioEscrito) errores.municipio = "Elige el municipio.";
  else if (departamento && !municipio) errores.municipio = `«${municipioEscrito}» no es un municipio de ${departamento}.`;
  if (Object.keys(errores).length > 0 || !departamento || !municipio) return { ok: false, errores };
  return { ok: true, sucursal: { nombre, direccion, departamento, municipio } };
}

// Nombre de empresa normalizado para agrupar lo que escribieron los aprendices antes del
// catálogo: «Frisby», « frisby » y «FRISBY» son el mismo texto.
export function nombreNormalizado(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Empresas que los aprendices escribieron a mano y que todavía no están enlazadas al catálogo.
// Son la lista de trabajo del administrador para registrar las existentes sin inventar NIT.
export async function empresasPendientes() {
  const perfiles = await prisma.companyProfile.findMany({
    where: { empresaId: null },
    select: { empresaPatrocinadora: true, direccionEmpresa: true },
  });

  const grupos = new Map<string, { nombre: string; direccion: string; aprendices: number }>();
  for (const p of perfiles) {
    const clave = nombreNormalizado(p.empresaPatrocinadora);
    const g = grupos.get(clave);
    if (g) g.aprendices++;
    else grupos.set(clave, { nombre: p.empresaPatrocinadora.trim(), direccion: p.direccionEmpresa, aprendices: 1 });
  }
  return [...grupos.values()].sort((a, b) => b.aprendices - a.aprendices || a.nombre.localeCompare(b.nombre));
}

// Validación de una empresa, la misma para el alta, la edición y la importación desde hoja de
// cálculo: NIT con dígito de verificación, departamento con su nombre oficial y los textos
// obligatorios. Devuelve los datos ya normalizados o los errores por campo.

export type EmpresaValida = {
  nit: string;
  nombre: string;
  direccion: string;
  departamento: string;
  municipio: string;
};

export function validarEmpresa(entrada: {
  nit?: string;
  nombre?: string;
  direccion?: string;
  departamento?: string;
  municipio?: string;
}): { ok: true; empresa: EmpresaValida } | { ok: false; errores: Record<string, string> } {
  const errores: Record<string, string> = {};

  const nit = validarNit(entrada.nit ?? "");
  if (!nit.ok) errores.nit = nit.error;

  const nombre = (entrada.nombre ?? "").replace(/\s+/g, " ").trim();
  if (nombre.length < 2) errores.nombre = "Falta el nombre de la empresa.";

  const direccion = (entrada.direccion ?? "").replace(/\s+/g, " ").trim();
  if (direccion.length < 5) errores.direccion = "Falta la dirección de la empresa.";

  const departamento = departamentoOficial(entrada.departamento ?? "");
  if (!departamento) {
    errores.departamento = entrada.departamento?.trim()
      ? `«${entrada.departamento.trim()}» no es un departamento de Colombia.`
      : "Falta el departamento.";
  }

  const municipioEscrito = (entrada.municipio ?? "").replace(/\s+/g, " ").trim();
  const municipio = departamento ? municipioOficial(departamento, municipioEscrito) : null;
  if (!municipioEscrito) errores.municipio = "Falta el municipio.";
  else if (departamento && !municipio) {
    errores.municipio = `«${municipioEscrito}» no es un municipio de ${departamento}.`;
  }

  if (Object.keys(errores).length > 0 || !nit.ok || !departamento || !municipio) {
    return { ok: false, errores };
  }
  return { ok: true, empresa: { nit: nit.nit, nombre, direccion, departamento, municipio } };
}
