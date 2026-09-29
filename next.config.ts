import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pdfjs-dist` carga su worker con un import dinámico que el empaquetador no puede resolver;
  // dejándolo fuera del bundle, en el servidor se carga desde node_modules y funciona. Lo usa la
  // lectura del formato GFPI-F-023 adjunto (src/lib/leer-gfpi023.ts).
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
