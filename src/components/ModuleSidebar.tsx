import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Home, LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SidebarUserSection } from "@/components/helpdesk/SidebarUserSection";
import appLogo from "@/assets/app-logo.png";

export interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon;
  children?: { title: string; url: string; icon?: LucideIcon }[];
}

interface ModuleSidebarProps {
  moduleName: string;
  moduleIcon: LucideIcon;
  items: SidebarItem[];
}

export function ModuleSidebar({ moduleName, moduleIcon: ModuleIcon, items }: ModuleSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Auto-expand active section
  useEffect(() => {
    items.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(c =>
          location.pathname === c.url || location.pathname.startsWith(c.url + "/")
        );
        if (isChildActive && !expandedSections.includes(item.title)) {
          setExpandedSections(prev => [...prev, item.title]);
        }
      }
    });
  }, [location.pathname]);

  const isActive = (url: string) => location.pathname === url || location.pathname.startsWith(url + "/");

  const toggleSection = (title: string) => {
    setExpandedSections(prev => prev.includes(title) ? prev.filter(s => s !== title) : [...prev, title]);
  };

  const renderItem = (item: SidebarItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const active = isActive(item.url) || item.children?.some(c => isActive(c.url));
    const isExpanded = expandedSections.includes(item.title);

    const baseStyles = cn(
      "flex items-center h-8 rounded-lg transition-all duration-200 text-sm w-full",
      active ? "text-primary bg-accent" : "text-foreground hover:text-primary hover:bg-accent/40"
    );

    if (!hasChildren) {
      const link = (
        <NavLink to={item.url} end className={baseStyles}>
          <div className="w-12 flex items-center justify-center flex-shrink-0">
            <item.icon className="h-4 w-4" />
          </div>
          {!collapsed && <span className="truncate">{item.title}</span>}
        </NavLink>
      );

      if (collapsed) {
        return (
          <TooltipProvider key={item.title} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}><p className="text-xs">{item.title}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return <div key={item.title}>{link}</div>;
    }

    if (collapsed) {
      const firstUrl = item.children?.[0]?.url || item.url;
      return (
        <TooltipProvider key={item.title} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to={firstUrl} className={baseStyles}>
                <div className="w-12 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4" />
                </div>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}><p className="text-xs">{item.title}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Collapsible key={item.title} open={isExpanded} onOpenChange={() => toggleSection(item.title)}>
        <CollapsibleTrigger asChild>
          <button className={baseStyles}>
            <div className="w-12 flex items-center justify-center flex-shrink-0">
              <item.icon className="h-4 w-4" />
            </div>
            <span className="flex-1 text-left truncate">{item.title}</span>
            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 mr-2", isExpanded && "rotate-90")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-0.5 space-y-0.5">
          {item.children?.map(child => {
            const childActive = isActive(child.url);
            const Icon = child.icon;
            return (
              <NavLink key={child.title} to={child.url} className={cn(
                "flex items-center h-7 px-2.5 rounded-md text-xs transition-all duration-200 border-l-2 ml-3 pl-4",
                childActive ? "text-primary bg-accent/70 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border-border"
              )}>
                {Icon && <Icon className="h-3 w-3 mr-2 flex-shrink-0" />}
                <span className="truncate">{child.title}</span>
              </NavLink>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const homeButton = (
    <button onClick={() => navigate("/")} className="flex items-center h-8 w-full rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40">
      <div className="w-12 flex items-center justify-center flex-shrink-0"><Home className="h-4 w-4" /></div>
      {!collapsed && <span>Back to Home</span>}
    </button>
  );

  return (
    <aside className="h-screen flex flex-col bg-background transition-all duration-300 ease-in-out border-r border-border shrink-0"
      style={{ width: collapsed ? "48px" : "200px", minWidth: collapsed ? "48px" : "200px", maxWidth: collapsed ? "48px" : "200px" }}>
      
      {/* Header */}
      <div className="flex items-center border-b border-border h-11 overflow-hidden">
        <div className="w-12 h-11 flex items-center justify-center flex-shrink-0">
          <ModuleIcon className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && <span className="text-sm font-semibold text-primary whitespace-nowrap">{moduleName}</span>}
      </div>

      {/* Home link */}
      <div className="px-1.5 pt-2 pb-1">
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>{homeButton}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}><p className="text-xs">Back to Home</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : homeButton}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-1 overflow-y-auto space-y-0.5 px-1.5">
        {items.map(renderItem)}
      </nav>

      {/* Collapse */}
      <div className="border-t border-border p-1.5">
        {(() => {
          const btn = (
            <button onClick={() => setCollapsed(!collapsed)} className="flex items-center h-8 w-full rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40">
              <div className="w-12 flex items-center justify-center flex-shrink-0">
                <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
              </div>
              {!collapsed && <span>Collapse</span>}
            </button>
          );
          if (collapsed) return (
            <TooltipProvider delayDuration={0}><Tooltip><TooltipTrigger asChild>{btn}</TooltipTrigger><TooltipContent side="right" sideOffset={8}><p className="text-xs">Expand</p></TooltipContent></Tooltip></TooltipProvider>
          );
          return btn;
        })()}
      </div>

      <SidebarUserSection collapsed={collapsed} />
    </aside>
  );
}
