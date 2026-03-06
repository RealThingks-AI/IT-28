import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package, LayoutDashboard, List, PlusCircle, LogOut, LogIn, Settings, Users, FileDown, ShieldCheck, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ModuleLayout from "./ModuleLayout";
import type { SidebarItem } from "@/components/ModuleSidebar";

const assetsSidebarItems: SidebarItem[] = [
  { title: "Dashboard", url: "/assets/dashboard", icon: LayoutDashboard },
  { title: "All Assets", url: "/assets/allassets", icon: List },
  { title: "Add Asset", url: "/assets/add", icon: PlusCircle },
  { title: "Check Out", url: "/assets/checkout", icon: LogOut },
  { title: "Check In", url: "/assets/checkin", icon: LogIn },
  {
    title: "Verification",
    url: "/assets/verification",
    icon: ShieldCheck,
    children: [
      { title: "Overview", url: "/assets/verification", icon: ShieldCheck },
      { title: "Overdue", url: "/assets/allassets?confirmation=overdue", icon: Clock },
      { title: "Denied", url: "/assets/allassets?confirmation=denied", icon: XCircle },
    ],
  },
  { title: "Employees", url: "/assets/employees", icon: Users },
  { title: "Import/Export", url: "/assets/import-export", icon: FileDown },
  { title: "Advanced", url: "/assets/advanced", icon: Settings },
];

export default function AssetsLayout() {
  const queryClient = useQueryClient();

  // Prefetch critical data on mount for instant navigation
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["itam-assets-dashboard-full"],
      queryFn: async () => {
        const { data } = await supabase.from("itam_assets").select("id, asset_id, asset_tag, name, status, is_active, purchase_price, purchase_date, warranty_expiry, expected_return_date, checked_out_to, assigned_to, checked_out_at, created_at, updated_at, custom_fields, category:itam_categories(id, name)").eq("is_active", true).limit(5000);
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["itam-categories"],
      queryFn: async () => {
        const { data } = await supabase.from("itam_categories").select("*").eq("is_active", true).order("name");
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["itam-makes"],
      queryFn: async () => {
        const { data } = await supabase.from("itam_makes").select("*").eq("is_active", true).order("name");
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ["users-list"],
      queryFn: async () => {
        const { data } = await supabase.from("users").select("id, name, email, auth_user_id, status, avatar_url").eq("status", "active").order("name");
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  return <ModuleLayout moduleName="Assets" moduleIcon={Package} sidebarItems={assetsSidebarItems} />;
}
