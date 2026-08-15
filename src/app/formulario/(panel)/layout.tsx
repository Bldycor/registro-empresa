import { PanelSidebar } from "@/components/panel-sidebar";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col sm:flex-row">
      <PanelSidebar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
