import { Package, LayoutDashboard, List, PlusCircle, LogOut, LogIn, Trash2, CalendarClock, Wrench, ShoppingCart, Key, Building2, TrendingDown, BarChart3, ScrollText, ClipboardCheck, Settings, FileDown } from "lucide-react";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const assetsSidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/assets/dashboard", icon: LayoutDashboard },
  { title: "All Assets", url: "/assets/allassets", icon: List },
  { title: "Add Asset", url: "/assets/add", icon: PlusCircle },
  { title: "Check Out", url: "/assets/checkout", icon: LogOut },
  { title: "Check In", url: "/assets/checkin", icon: LogIn },
  { title: "Dispose", url: "/assets/dispose", icon: Trash2 },
  { title: "Reserve", url: "/assets/reserve", icon: CalendarClock },
  { title: "Vendors", url: "/assets/vendors", icon: Building2 },
  { title: "Licenses", url: "/assets/licenses", icon: Key },
  { title: "Repairs", url: "/assets/repairs", icon: Wrench },
  { title: "Purchase Orders", url: "/assets/purchase-orders", icon: ShoppingCart },
  { title: "Depreciation", url: "/assets/depreciation", icon: TrendingDown },
  { title: "Import / Export", url: "/assets/import-export", icon: FileDown },
  { title: "Reports", url: "/assets/reports", icon: BarChart3 },
  { title: "Logs", url: "/assets/logs", icon: ScrollText },
  { title: "Audit", url: "/assets/audit", icon: ClipboardCheck },
  { title: "Advanced", url: "/assets/advanced", icon: Settings },
];

export default function AssetsLayout() {
  return <ModuleLayout moduleName="Assets" moduleIcon={Package} sidebarItems={assetsSidebarItems} />;
}
