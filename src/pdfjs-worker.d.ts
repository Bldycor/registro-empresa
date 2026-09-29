// El worker de pdfjs no trae tipos: se importa solo por su efecto (registrarse en `globalThis`)
// para poder leer PDF en el servidor. Ver src/lib/leer-gfpi023.ts.
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
