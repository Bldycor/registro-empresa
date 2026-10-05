import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las respuestas (4 oct 2026): nadie puede incrustar SEPA en
// otro sitio (clickjacking), el navegador no adivina tipos de archivo, no se filtra la URL
// completa a otros sitios, se exige HTTPS y se apagan permisos que la aplicación no usa.
const cabecerasSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // `pdfjs-dist` carga su worker con un import dinámico que el empaquetador no puede resolver;
  // dejándolo fuera del bundle, en el servidor se carga desde node_modules y funciona. Lo usa la
  // lectura del formato GFPI-F-023 adjunto (src/lib/leer-gfpi023.ts).
  serverExternalPackages: ["pdfjs-dist"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
