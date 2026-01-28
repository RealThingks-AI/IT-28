import { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, Ticket, Package, CreditCard, Activity, BarChart3, Settings, ChevronLeft, ChevronRight, Wrench, Receipt, ListChecks, Monitor, LucideIcon, ClipboardCheck, Key, Building2, ShoppingCart, TrendingDown, RefreshCw, Download, Calendar, Bell, List, Plus, LogOut, LogIn, Trash2, FileText, Upload, Image, Search, Users, Shield, Building, MapPin, Tag, Database, CalendarDays, Table, Sliders, Mail, FormInput } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { SidebarUserSection } from "./SidebarUserSection";
import { useMultiplePageAccess } from "@/hooks/usePageAccess";
import { useUserRole } from "@/hooks/useUserRole";
interface SidebarChild {
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: number;
  children?: SidebarChild[]; // For nested sub-menus
}
interface SidebarSection {
  title: string;
  url?: string;
  icon: LucideIcon;
  children?: SidebarChild[];
  parentRoute: string;
  badge?: number;
}

// Asset module sub-sections matching AssetTiger structure
const assetChildren: SidebarChild[] = [{
  title: "Dashboard",
  url: "/assets/dashboard",
  icon: LayoutDashboard
}, {
  title: "Assets",
  url: "/assets/allassets",
  icon: Package,
  children: [{
    title: "List of Assets",
    url: "/assets/allassets",
    icon: List
  }, {
    title: "Add an Asset",
    url: "/assets/add",
    icon: Plus
  }, {
    title: "Check out",
    url: "/assets/checkout",
    icon: LogOut
  }, {
    title: "Check in",
    url: "/assets/checkin",
    icon: LogIn
  }, {
    title: "Dispose",
    url: "/assets/dispose",
    icon: Trash2
  }, {
    title: "Maintenance",
    url: "/assets/lists/maintenances",
    icon: Wrench
  }]
}, {
  title: "Lists",
  url: "/assets/allassets",
  icon: List,
  children: [{
    title: "List of Assets",
    url: "/assets/allassets",
    icon: Package
  }, {
    title: "List of Maintenances",
    url: "/assets/lists/maintenances",
    icon: Wrench
  }, {
    title: "List of Warranties",
    url: "/assets/lists/warranties",
    icon: ClipboardCheck
  }, {
    title: "List of Contracts",
    url: "/assets/lists/contracts",
    icon: Receipt
  }]
}, {
  title: "Reports",
  url: "/assets/reports",
  icon: BarChart3,
  children: [{
    title: "Asset Reports",
    url: "/assets/reports?type=asset",
    icon: Package
  }, {
    title: "Audit Reports",
    url: "/assets/reports?type=audit",
    icon: ClipboardCheck
  }, {
    title: "Check-Out Reports",
    url: "/assets/reports?type=checkout",
    icon: LogOut
  }, {
    title: "Contract Reports",
    url: "/assets/reports?type=contract",
    icon: Receipt
  }, {
    title: "Maintenance Reports",
    url: "/assets/reports?type=maintenance",
    icon: Wrench
  }, {
    title: "Reservation Reports",
    url: "/assets/reports?type=reservation",
    icon: Calendar
  }, {
    title: "Status Reports",
    url: "/assets/reports?type=status",
    icon: Activity
  }, {
    title: "Transaction Reports",
    url: "/assets/reports?type=transaction",
    icon: FileText
  }]
}, {
  title: "Tools",
  url: "/assets/tools",
  icon: Wrench,
  children: [{
    title: "Import",
    url: "/assets/tools?tab=import",
    icon: Upload
  }, {
    title: "Export",
    url: "/assets/tools?tab=export",
    icon: Download
  }, {
    title: "Documents Gallery",
    url: "/assets/tools?tab=documents",
    icon: FileText
  }, {
    title: "Image Gallery",
    url: "/assets/tools?tab=images",
    icon: Image
  }, {
    title: "Audit",
    url: "/assets/audit",
    icon: Search
  }]
}, {
  title: "Advanced",
  url: "/assets/licenses",
  icon: Settings,
  children: [{
    title: "Contracts/Licenses",
    url: "/assets/licenses",
    icon: Key
  }, {
    title: "Persons/Employees",
    url: "/assets/vendors",
    icon: Users
  }, {
    title: "Vendors",
    url: "/assets/vendors",
    icon: Building2
  }, {
    title: "Purchase Orders",
    url: "/assets/purchase-orders",
    icon: ShoppingCart
  }, {
    title: "Repairs",
    url: "/assets/repairs",
    icon: Wrench
  }, {
    title: "Depreciation",
    url: "/assets/depreciation",
    icon: TrendingDown
  }]
}, {
  title: "Setup",
  url: "/assets/setup",
  icon: Settings,
  children: [{
    title: "Company Information",
    url: "/assets/setup?section=company",
    icon: Building
  }, {
    title: "Sites",
    url: "/assets/setup?section=sites",
    icon: MapPin
  }, {
    title: "Locations",
    url: "/assets/setup?section=locations",
    icon: MapPin
  }, {
    title: "Categories",
    url: "/assets/setup?section=categories",
    icon: Tag
  }, {
    title: "Departments",
    url: "/assets/setup?section=departments",
    icon: Building2
  }, {
    title: "Makes",
    url: "/assets/setup?section=makes",
    icon: Database
  }, {
    title: "Events",
    url: "/assets/setup?section=events",
    icon: CalendarDays
  }, {
    title: "Table Options",
    url: "/assets/setup?section=table",
    icon: Table
  }, {
    title: "Options",
    url: "/assets/setup?section=options",
    icon: Sliders
  }, {
    title: "Manage Dashboard",
    url: "/assets/setup?section=dashboard",
    icon: LayoutDashboard
  }, {
    title: "Customize Forms",
    url: "/assets/setup?section=forms",
    icon: FormInput
  }, {
    title: "Customize Emails",
    url: "/assets/setup?section=emails",
    icon: Mail
  }]
}];
const sidebarSections: SidebarSection[] = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard,
  parentRoute: "/"
}, {
  title: "Tickets",
  url: "/tickets",
  icon: Ticket,
  parentRoute: "/tickets"
}, {
  title: "Assets",
  icon: Package,
  parentRoute: "/assets",
  children: assetChildren
}, {
  title: "Subscription",
  icon: CreditCard,
  parentRoute: "/subscription",
  children: [{
    title: "Dashboard",
    url: "/subscription",
    icon: LayoutDashboard
  }, {
    title: "All Subscriptions",
    url: "/subscription/tools",
    icon: ListChecks
  }, {
    title: "Licenses",
    url: "/subscription/licenses",
    icon: Key
  }, {
    title: "Payments",
    url: "/subscription/payments",
    icon: Receipt
  }, {
    title: "Vendors",
    url: "/subscription/vendors",
    icon: Building2
  }]
}, {
  title: "Updates",
  icon: RefreshCw,
  parentRoute: "/system-updates",
  children: [{
    title: "Overview",
    url: "/system-updates",
    icon: LayoutDashboard
  }, {
    title: "All Updates",
    url: "/system-updates/updates",
    icon: Download
  }, {
    title: "Devices",
    url: "/system-updates/devices",
    icon: Monitor
  }, {
    title: "Settings",
    url: "/system-updates/settings",
    icon: Settings
  }]
}, {
  title: "Monitoring",
  url: "/monitoring",
  icon: Activity,
  parentRoute: "/monitoring"
}, {
  title: "Reports",
  url: "/reports",
  icon: BarChart3,
  parentRoute: "/reports"
}, {
  title: "Audit",
  url: "/audit",
  icon: ClipboardCheck,
  parentRoute: "/audit"
}, {
  title: "Settings",
  url: "/settings",
  icon: Settings,
  parentRoute: "/settings"
}];
export function HelpdeskSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const {
    role,
    isLoading: roleLoading
  } = useUserRole();

  // Get all parent routes to check access
  const parentRoutes = useMemo(() => sidebarSections.map(s => s.parentRoute), []);
  const {
    accessMap,
    isLoading: accessLoading
  } = useMultiplePageAccess(parentRoutes);

  // Filter sections based on database access
  const filteredSections = useMemo(() => {
    if (role === "admin") return sidebarSections; // Admins see everything

    return sidebarSections.filter(section => {
      return accessMap[section.parentRoute] === true;
    });
  }, [role, accessMap]);

  // Auto-expand section when child route is active
  useEffect(() => {
    const currentPath = location.pathname;
    filteredSections.forEach(section => {
      if (section.children) {
        const isChildActive = section.children.some(child => currentPath === child.url || currentPath.startsWith(child.url + "/"));
        if (isChildActive && !expandedSections.includes(section.title)) {
          setExpandedSections(prev => [...prev, section.title]);
        }
      }
    });
  }, [location.pathname, filteredSections]);
  const isActiveExact = (path: string) => {
    return location.pathname === path;
  };
  const isActiveSection = (section: SidebarSection) => {
    if (section.url === "/") return location.pathname === "/";
    if (section.url && location.pathname === section.url) return true;
    if (section.children) {
      return section.children.some(child => location.pathname === child.url || location.pathname.startsWith(child.url + "/"));
    }
    return section.url ? location.pathname.startsWith(section.url + "/") : false;
  };
  const toggleSection = (title: string) => {
    setExpandedSections(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
  };

  // Check if any nested child is active
  const isNestedChildActive = (child: SidebarChild): boolean => {
    if (!child.children) return false;
    return child.children.some(subChild => location.pathname === subChild.url || location.pathname.startsWith(subChild.url.split('?')[0]));
  };

  // Render nested sub-items (third level)
  const renderNestedChild = (subChild: SidebarChild) => {
    const baseUrl = subChild.url.split('?')[0];
    const active = location.pathname === baseUrl || location.pathname.startsWith(baseUrl);
    const Icon = subChild.icon;
    return <NavLink key={subChild.title} to={subChild.url} className={cn("flex items-center h-6 px-2 rounded-md text-xs transition-all duration-200", "ml-6 pl-3", active ? "text-primary bg-accent/50" : "text-muted-foreground hover:text-foreground hover:bg-accent/30")}>
        {Icon && <Icon className="h-3 w-3 mr-2 flex-shrink-0" />}
        <span className="truncate">{subChild.title}</span>
        {subChild.badge !== undefined && subChild.badge > 0 && <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 min-w-[18px] text-center">
            {subChild.badge}
          </span>}
      </NavLink>;
  };

  // Render first-level child items (with potential nested children)
  const renderChildItem = (child: SidebarChild) => {
    const hasNestedChildren = child.children && child.children.length > 0;
    const isExpanded = expandedSections.includes(`child-${child.title}`);
    const baseUrl = child.url.split('?')[0];
    const active = location.pathname === baseUrl || location.pathname.startsWith(baseUrl);
    const nestedActive = isNestedChildActive(child);
    const Icon = child.icon;

    // If child has nested children, render as expandable
    if (hasNestedChildren) {
      return <Collapsible key={child.title} open={isExpanded} onOpenChange={() => toggleSection(`child-${child.title}`)}>
          <CollapsibleTrigger asChild>
            <button className={cn("flex items-center h-7 w-full px-2.5 rounded-md text-xs transition-all duration-200", "border-l-2 ml-3 pl-4", active || nestedActive ? "text-primary bg-accent/70 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40 border-border")}>
              {Icon && <Icon className="h-3 w-3 mr-2 flex-shrink-0" />}
              <span className="flex-1 text-left truncate">{child.title}</span>
              {child.badge !== undefined && child.badge > 0 && <span className="mr-1 bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 min-w-[18px] text-center">
                  {child.badge}
                </span>}
              <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform duration-200 flex-shrink-0", isExpanded && "rotate-90")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-0.5 space-y-0.5 overflow-hidden">
            {child.children?.map(subChild => renderNestedChild(subChild))}
          </CollapsibleContent>
        </Collapsible>;
    }

    // Simple child item without nested children
    return <NavLink key={child.title} to={child.url} className={cn("flex items-center h-7 px-2.5 rounded-md text-xs transition-all duration-200", "border-l-2 ml-3 pl-4", active ? "text-primary bg-accent/70 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40 hover:translate-x-0.5 border-border")}>
        {Icon && <Icon className="h-3 w-3 mr-2 flex-shrink-0" />}
        <span className="truncate">{child.title}</span>
        {child.badge !== undefined && child.badge > 0}
      </NavLink>;
  };
  const renderSection = (section: SidebarSection) => {
    const hasChildren = section.children && section.children.length > 0;
    const isExpanded = expandedSections.includes(section.title);
    const sectionActive = isActiveSection(section);

    // Base styles for all section items
    const baseStyles = cn("flex items-center h-8 px-2.5 rounded-lg transition-all duration-200 text-sm w-full", sectionActive ? "text-primary bg-accent" : "text-foreground hover:text-primary hover:bg-accent/40");

    // No children - simple link
    if (!hasChildren && section.url) {
      const menuButton = <NavLink to={section.url} end={section.url === "/"} className={baseStyles}>
          <section.icon className={cn("h-4 w-4 flex-shrink-0", collapsed ? "" : "mr-2.5")} />
          <span className={cn("truncate transition-all duration-200", collapsed ? "opacity-0 w-0" : "opacity-100")}>
            {section.title}
          </span>
        </NavLink>;
      if (collapsed) {
        return <TooltipProvider key={section.title} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="z-50">
                <p className="text-xs">{section.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>;
      }
      return <div key={section.title}>{menuButton}</div>;
    }

    // Collapsed mode with children - just show icon with tooltip
    if (collapsed && hasChildren) {
      const firstChildUrl = section.children?.[0]?.url || "/";
      return <TooltipProvider key={section.title} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to={firstChildUrl} className={cn("flex items-center justify-center h-8 px-2.5 rounded-lg transition-all duration-200", sectionActive ? "text-primary bg-accent" : "text-foreground hover:text-primary hover:bg-accent/40")}>
                <section.icon className="h-4 w-4" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="z-50">
              <p className="text-xs">{section.title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>;
    }

    // Expanded mode with children - unified click-to-expand section
    return <Collapsible key={section.title} open={isExpanded} onOpenChange={() => toggleSection(section.title)}>
        <CollapsibleTrigger asChild>
          <button className={baseStyles}>
            <section.icon className="h-4 w-4 mr-2.5 flex-shrink-0" />
            <span className="flex-1 text-left truncate">{section.title}</span>
            {section.badge !== undefined && section.badge > 0 && <span className="mr-1 bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 min-w-[18px] text-center">
                {section.badge}
              </span>}
            <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0", isExpanded && "rotate-90")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-0.5 space-y-0.5 overflow-hidden">
          {section.children?.map(child => renderChildItem(child))}
        </CollapsibleContent>
      </Collapsible>;
  };
  const isLoading = roleLoading || accessLoading;
  return <aside className="h-screen flex flex-col bg-background transition-all duration-300 ease-in-out border-r border-border shrink-0" style={{
    width: collapsed ? "48px" : "200px",
    minWidth: collapsed ? "48px" : "200px",
    maxWidth: collapsed ? "48px" : "200px"
  }}>
      {/* Header */}
      <div className="flex items-center justify-center border-b border-border px-2 h-11 overflow-hidden">
        <div className="relative flex items-center justify-center">
          <span className={cn("text-sm text-primary transition-all duration-300 whitespace-nowrap", collapsed ? "opacity-0 scale-95 absolute" : "opacity-100 scale-100")}>
            RT-IT-Hub
          </span>
          <span className={cn("text-sm text-primary transition-all duration-300", collapsed ? "opacity-100 scale-100" : "opacity-0 scale-95 absolute")}>
            RT
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-2 px-1.5 overflow-y-auto space-y-0.5">
        {isLoading ? <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div> : filteredSections.map(section => renderSection(section))}
      </nav>

      {/* Collapse Button */}
      <div className="border-t border-border p-1.5">
        {(() => {
        const collapseButton = <button onClick={() => setCollapsed(!collapsed)} className="flex items-center h-8 w-full px-2.5 rounded-lg transition-all duration-200 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40">
              <ChevronLeft className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-300", collapsed ? "rotate-180" : "")} />
              <span className={cn("ml-2.5 transition-all duration-200", collapsed ? "opacity-0 w-0" : "opacity-100")}>
                Collapse
              </span>
            </button>;
        if (collapsed) {
          return <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>{collapseButton}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="z-50">
                    <p className="text-xs">Expand sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>;
        }
        return collapseButton;
      })()}
      </div>

      {/* User Section */}
      <SidebarUserSection collapsed={collapsed} />
    </aside>;
}