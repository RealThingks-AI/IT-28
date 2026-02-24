import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationPanel } from "@/components/NotificationPanel";
import { ModuleSidebar, type SidebarItem } from "@/components/ModuleSidebar";
import { LucideIcon } from "lucide-react";

interface ModuleLayoutProps {
  moduleName: string;
  moduleIcon: LucideIcon;
  sidebarItems: SidebarItem[];
  pageTitle?: string;
}

export default function ModuleLayout({ moduleName, moduleIcon, sidebarItems, pageTitle }: ModuleLayoutProps) {
  const { user, loading } = useAuth();

  if (!loading && !user) return <Navigate to="/login" replace />;

  return (
    <div className="h-screen flex w-full overflow-hidden">
      <ModuleSidebar moduleName={moduleName} moduleIcon={moduleIcon} items={sidebarItems} />
      <main className="flex-1 h-screen flex flex-col bg-background overflow-hidden">
        <header className="border-b px-4 flex items-center justify-between shrink-0 min-h-[2.75rem]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {pageTitle && <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>}
            <div id="module-header-portal" className="flex-shrink-0" />
          </div>
          <NotificationPanel />
        </header>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
