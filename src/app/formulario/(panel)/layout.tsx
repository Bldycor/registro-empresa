// El menú de navegación entre procesos ahora vive en el layout externo
// (src/app/formulario/layout.tsx) para que aparezca en todas las pantallas del flujo,
// incluida la de creación del perfil de empresa. Este layout queda como simple passthrough.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
