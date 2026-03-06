import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCalendar, CalendarEvent } from "@/components/helpdesk/assets/DashboardCalendar";
import { FeedFilters, DEFAULT_FILTERS } from "@/components/helpdesk/assets/FeedSettingsDropdown";
import { ManageDashboardDialog, DashboardPreferences, DEFAULT_PREFERENCES, dbSettingsToPreferences } from "@/components/helpdesk/assets/ManageDashboardDialog";
import { AssetModuleTopBar } from "@/components/helpdesk/assets/AssetModuleTopBar";
import { useUISettings } from "@/hooks/useUISettings";
import { useCurrency } from "@/hooks/useCurrency";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, LogOut, LogIn, BarChart3, AlertTriangle, ShieldAlert } from "lucide-react";

// Extracted sub-components
import { ActivityFeed } from "@/components/helpdesk/assets/dashboard/ActivityFeed";
import { StatWidgets } from "@/components/helpdesk/assets/dashboard/StatWidgets";
import { CategoryPieChart } from "@/components/helpdesk/assets/dashboard/CategoryPieChart";
import type { CheckinRecord, CheckoutRecord, RepairRecord, DashboardAsset, LicenseRecord } from "@/components/helpdesk/assets/dashboard/types";
import { DeniedAssetsDialog } from "@/components/helpdesk/assets/DeniedAssetsDialog";

const AssetDashboard = () => {
  const navigate = useNavigate();
  const [feedFilters, setFeedFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [deniedDialogOpen, setDeniedDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { dashboardPreferences: dbDashPrefs, updateDashboardPreferences, isAuthenticated } = useUISettings();
  const { formatCurrency } = useCurrency();
  const [feedFiltersLoaded, setFeedFiltersLoaded] = useState(false);

  useEffect(() => {
    if (dbDashPrefs) {
      const prefs = dbSettingsToPreferences(dbDashPrefs);
      setPreferences(prefs);
      if (!feedFiltersLoaded && dbDashPrefs.feedFilters) {
        const savedFilters = dbDashPrefs.feedFilters;
        setFeedFilters({ ...DEFAULT_FILTERS, ...savedFilters });
        setFeedFiltersLoaded(true);
      }
    }
  }, [dbDashPrefs, feedFiltersLoaded]);

  const handleFeedFiltersChange = (newFilters: FeedFilters) => {
    setFeedFilters(newFilters);
    if (isAuthenticated && dbDashPrefs) {
      updateDashboardPreferences({ ...dbDashPrefs, feedFilters: newFilters });
    }
  };

  // ── Data queries ──
  const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets, dataUpdatedAt } = useQuery({
    queryKey: ["itam-assets-dashboard-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("id, asset_id, asset_tag, name, status, is_active, purchase_price, purchase_date, warranty_expiry, expected_return_date, checked_out_to, assigned_to, checked_out_at, created_at, updated_at, custom_fields, confirmation_status, last_confirmed_at, category:itam_categories(id, name)")
        .eq("is_active", true)
        .limit(5000);
      return (data || []) as DashboardAsset[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // ── Derived from main assets query (eliminates 4 separate queries) ──
  const { overdueAssignments, newAssets, expiringWarranties, allWarrantyAssets } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const overdue = assets
      .filter((a) => a.status === "in_use" && a.expected_return_date && a.expected_return_date < todayStr)
      .map((a) => ({
        id: a.id,
        asset_id: a.id,
        expected_return_date: a.expected_return_date,
        asset: { id: a.id, name: a.name, asset_tag: a.asset_tag, asset_id: a.asset_id },
      }));

    const newA = assets
      .filter((a) => a.created_at && new Date(a.created_at) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 15);

    const expiringW = assets.filter((a) => {
      if (!a.warranty_expiry) return false;
      const exp = new Date(a.warranty_expiry);
      return exp >= today && exp <= thirtyDaysFromNow;
    });

    const allW = assets.filter((a) => a.warranty_expiry != null);

    return { overdueAssignments: overdue, newAssets: newA, expiringWarranties: expiringW, allWarrantyAssets: allW };
  }, [assets]);

  const { data: recentCheckins = [], isLoading: checkinsLoading, refetch: refetchCheckins } = useQuery({
    queryKey: ["itam-recent-checkins"],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<CheckinRecord[]> => {
      // Parallel fetch: history + users (eliminates waterfall)
      const [historyResult, usersResult] = await Promise.all([
        supabase
          .from("itam_asset_history")
          .select("id, asset_id, asset_tag, action, old_value, new_value, details, performed_by, created_at")
          .eq("action", "checked_in")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase.from("users").select("id, auth_user_id, name, email"),
      ]);

      const data = historyResult.data;
      if (!data || data.length === 0) return [];

      // Build user lookup map upfront
      const userMap = new Map<string, string>();
      (usersResult.data || []).forEach((u) => {
        if (u.auth_user_id) userMap.set(u.auth_user_id, u.name || u.email || u.id);
      });

      // Fetch asset details for matched history items
      const assetIds = [...new Set(data.map((d) => d.asset_id))];
      const { data: assetData } = await supabase
        .from("itam_assets")
        .select("id, name, asset_tag, asset_id, category:itam_categories(name)")
        .in("id", assetIds);
      const assetMap = new Map((assetData || []).map((a) => [a.id, a]));

      return data.map((d) => {
        const asset = assetMap.get(d.asset_id) as CheckinRecord["asset"];
        const userName = d.old_value || (d.details as Record<string, unknown> | null)?.returned_from as string || "—";
        return { ...d, details: d.details as unknown, asset, user_name: userName, performer_name: d.performed_by ? (userMap.get(d.performed_by) || null) : null } as CheckinRecord;
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Shared user lookup for checkouts (reuse across queries)
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email, auth_user_id, status, avatar_url").eq("status", "active").order("name");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const userMapById = useMemo(() => {
    const map = new Map<string, string>();
    allUsers.forEach((u) => map.set(u.id, u.name || u.email || u.id));
    return map;
  }, [allUsers]);

  const { data: recentCheckouts = [], refetch: refetchCheckouts } = useQuery({
    queryKey: ["itam-recent-checkouts"],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<CheckoutRecord[]> => {
      const { data } = await supabase
        .from("itam_assets")
        .select("id, name, asset_tag, asset_id, status, checked_out_to, assigned_to, checked_out_at, updated_at, category:itam_categories(name)")
        .eq("is_active", true)
        .eq("status", "in_use")
        .order("checked_out_at", { ascending: false, nullsFirst: false })
        .limit(15);
      if (!data || data.length === 0) return [];

      return data.map((d) => {
        const userId = d.checked_out_to || d.assigned_to;
        return { ...d, assigned_to_name: userId ? (userMapById.get(userId) || null) : null } as CheckoutRecord;
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { data: activeRepairs = [], refetch: refetchRepairs } = useQuery({
    queryKey: ["itam-active-repairs"],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<RepairRecord[]> => {
      const { data } = await supabase.from("itam_repairs").select("*, asset:itam_assets(id, name, asset_tag, asset_id, category:itam_categories(name))").in("status", ["pending", "in_progress"]).order("created_at", { ascending: false }).limit(15);
      return (data || []) as RepairRecord[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Combined disposed + lost query
  const { data: inactiveAssets = [], refetch: refetchInactive } = useQuery({
    queryKey: ["itam-inactive-assets"],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data } = await supabase.from("itam_assets").select("*, category:itam_categories(name)").in("status", ["disposed", "lost"]).order("updated_at", { ascending: false }).limit(30);
      return (data || []) as unknown as DashboardAsset[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { disposedAssets, lostAssets } = useMemo(() => ({
    disposedAssets: inactiveAssets.filter((a) => a.status === "disposed").slice(0, 15),
    lostAssets: inactiveAssets.filter((a) => a.status === "lost").slice(0, 15),
  }), [inactiveAssets]);

  const expiringLeases = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    return assets.filter((asset) => {
      const customFields = asset.custom_fields as Record<string, unknown> | null;
      const leaseExpiry = customFields?.lease_expiry as string | undefined;
      if (!leaseExpiry) return false;
      const expiryDate = new Date(leaseExpiry);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
    });
  }, [assets]);

  const { data: maintenanceDue = [], refetch: refetchMaintenance } = useQuery({
    queryKey: ["itam-maintenance-due"],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data } = await supabase.from("itam_repairs").select("*, asset:itam_assets(id, name, asset_tag)").eq("status", "pending").order("started_at", { ascending: true }).limit(15);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Combined license query
  const { data: allLicenses = [], refetch: refetchLicenses } = useQuery({
    queryKey: ["itam-licenses-dashboard"],
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<LicenseRecord[]> => {
      const { data } = await supabase.from("itam_licenses").select("id, name, expiry_date").eq("is_active", true);
      return (data || []) as LicenseRecord[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const { activeLicenses, expiringLicenses } = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    const expiring = allLicenses.filter((l) => {
      if (!l.expiry_date) return false;
      const exp = new Date(l.expiry_date);
      return exp >= today && exp <= thirtyDaysFromNow;
    });
    return { activeLicenses: allLicenses, expiringLicenses: expiring };
  }, [allLicenses]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchAssets(), refetchCheckins(), refetchCheckouts(), refetchRepairs(),
      refetchInactive(), refetchMaintenance(), refetchLicenses(),
    ]);
    setIsRefreshing(false);
  };

  // ── Stats (memoized) ──
  const { totalAssets, activeAssets, availableAssets, totalValue, hasMixedCurrencies, checkedOutCount, underRepairCount, disposedCount, fiscalYearValue, fiscalYearPurchases, pendingConfirmationCount, deniedCount } = useMemo(() => {
    const total = assets.length;
    const active = assets.filter((a) => a.status !== "disposed" && a.status !== "lost").length;
    const available = assets.filter((a) => a.status === "available").length;
    const value = assets.reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);
    const currencies = new Set(assets.map((a) => {
      const cf = a.custom_fields as Record<string, unknown> | null;
      return (cf?.currency as string) || "INR";
    }));
    const checkedOut = assets.filter((a) => a.status === "in_use").length;
    const underRepair = assets.filter((a) => a.status === "maintenance").length;
    const disposed = assets.filter((a) => a.status === "disposed").length;

    const fyStart = new Date();
    if (fyStart.getMonth() < 3) fyStart.setFullYear(fyStart.getFullYear() - 1);
    fyStart.setMonth(3, 1);
    fyStart.setHours(0, 0, 0, 0);
    const fyPurchases = assets.filter((a) => a.purchase_date && new Date(a.purchase_date) >= fyStart);
    const fyValue = fyPurchases.reduce((sum, a) => sum + (parseFloat(String(a.purchase_price || 0)) || 0), 0);

    // Confirmation counts — 60-day bi-monthly cycle
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const assignedAssets = assets.filter((a) => a.status === "in_use" && a.assigned_to);
    const pending = assignedAssets.filter((a) => {
      if ((a as any).confirmation_status === "denied") return false;
      if (!a.last_confirmed_at) return true;
      return new Date(a.last_confirmed_at) < sixtyDaysAgo;
    }).length;
    const denied = assets.filter((a) => (a as any).confirmation_status === "denied").length;

    return {
      totalAssets: total, activeAssets: active, availableAssets: available,
      totalValue: value, hasMixedCurrencies: currencies.size > 1,
      checkedOutCount: checkedOut, underRepairCount: underRepair, disposedCount: disposed,
      fiscalYearValue: fyValue, fiscalYearPurchases: fyPurchases,
      pendingConfirmationCount: pending, deniedCount: denied,
    };
  }, [assets]);

  // ── Category distribution ──
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((a) => {
      const catName = a.category?.name || "Uncategorized";
      counts[catName] = (counts[catName] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        count,
        percent: totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0,
      }));
  }, [assets, totalAssets]);

  // ── Calendar events ──
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];
    allWarrantyAssets.forEach((asset) => {
      if (asset.warranty_expiry) {
        events.push({ id: `warranty-${asset.id}`, date: new Date(asset.warranty_expiry), title: asset.asset_tag || asset.name || "Asset", type: "warranty", assetId: Number(asset.id), assetTag: asset.asset_tag || undefined });
      }
    });
    overdueAssignments.forEach((assignment) => {
      if (assignment.expected_return_date) {
        events.push({ id: `overdue-${assignment.id}`, date: new Date(assignment.expected_return_date), title: assignment.asset?.asset_tag || assignment.asset?.name || "Asset", type: "asset_due", assetId: Number(assignment.asset_id), assetTag: assignment.asset?.asset_tag || undefined });
      }
    });
    maintenanceDue.forEach((repair: Record<string, unknown>) => {
      const repairDate = (repair.scheduled_date as string) || (repair.created_at as string);
      if (repairDate) {
        const asset = repair.asset as { asset_tag?: string; id?: string } | null;
        events.push({ id: `maintenance-${repair.id}`, date: new Date(repairDate), title: asset?.asset_tag || "Maintenance", type: "maintenance", assetId: Number(repair.asset_id), assetTag: asset?.asset_tag || undefined });
      }
    });
    activeLicenses.forEach((lic) => {
      if (lic.expiry_date) {
        events.push({ id: `license-${lic.id}`, date: new Date(lic.expiry_date), title: lic.name || "License", type: "license" as CalendarEvent["type"] });
      }
    });
    return events;
  }, [allWarrantyAssets, overdueAssignments, maintenanceDue, activeLicenses]);

  const enabledWidgets = preferences.widgets.filter((w) => w.enabled);
  const gridColumns = preferences.columns || 5;
  const gridColsClass = gridColumns === 3 ? "lg:grid-cols-3" : gridColumns === 4 ? "lg:grid-cols-4" : gridColumns === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5";

  return (
    <>
      {/* Portal search/add/manage into the header bar */}
      <AssetModuleTopBar
        onManageDashboard={() => setManageDialogOpen(true)}
        showColumnSettings={false}
        showExport={false}
      />

      <div className="h-full overflow-y-auto bg-background">
        <div className="p-3 space-y-2">
          {/* Empty state when no assets exist */}
          {!assetsLoading && totalAssets === 0 && (
            <Card className="animate-fade-in">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-semibold">No assets yet</h3>
                  <p className="text-xs text-muted-foreground max-w-[280px]">Get started by adding your first asset to track inventory, assignments, and more.</p>
                </div>
                <Button size="sm" className="gap-1.5" onClick={() => navigate("/assets/add")}>
                  <Plus className="h-3.5 w-3.5" /> Add Your First Asset
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Denied Assets Alert */}
          {!assetsLoading && (() => {
            const deniedAssets = assets.filter((a: any) => (a as any).confirmation_status === "denied");
            if (deniedAssets.length === 0) return null;
            return (
              <Card className="animate-fade-in border-destructive/30 bg-destructive/5">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-destructive">
                      {deniedAssets.length} asset{deniedAssets.length !== 1 ? "s" : ""} denied by employee
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {deniedAssets.slice(0, 3).map((a: any) => a.asset_tag || a.name).join(", ")}
                      {deniedAssets.length > 3 ? ` and ${deniedAssets.length - 3} more` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => setDeniedDialogOpen(true)}>
                    View All
                  </Button>
                </CardContent>
              </Card>
            );
          })()}

          {/* Overdue Confirmation Alert */}
          {!assetsLoading && pendingConfirmationCount > 0 && (
            <Card className="animate-fade-in border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {pendingConfirmationCount} asset{pendingConfirmationCount !== 1 ? "s" : ""} overdue for re-verification
                  </p>
                  <p className="text-xs text-muted-foreground">Assets not confirmed in the last 60 days</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => navigate("/assets/allassets?confirmation=overdue")}>
                  Review
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stat Cards */}
          <StatWidgets
            assetsLoading={assetsLoading}
            enabledWidgets={enabledWidgets}
            gridColsClass={gridColsClass}
            activeAssets={activeAssets}
            totalAssets={totalAssets}
            availableAssets={availableAssets}
            totalValue={totalValue}
            hasMixedCurrencies={hasMixedCurrencies}
            fiscalYearValue={fiscalYearValue}
            fiscalYearPurchases={fiscalYearPurchases}
            checkedOutCount={checkedOutCount}
            underRepairCount={underRepairCount}
            disposedCount={disposedCount}
            overdueAssignments={overdueAssignments}
            activeLicenses={activeLicenses}
            expiringLicenses={expiringLicenses}
            expiringWarranties={expiringWarranties}
            expiringLeases={expiringLeases}
            maintenanceDueCount={maintenanceDue.length}
            pendingConfirmationCount={pendingConfirmationCount}
            deniedCount={deniedCount}
            formatCurrency={formatCurrency}
            assets={assets}
          />

          {/* Activity Feed + Category Pie Chart + Calendar + Quick Actions — 2-column layout */}
          {(() => {
            const hasLeftColumn = preferences.showFeeds;
            const hasRightContent = preferences.showChart || preferences.showCalendar;
            const useGrid = hasLeftColumn || hasRightContent;
            return (
              <div className={cn(
                useGrid ? "grid grid-cols-1 lg:grid-cols-2 gap-3" : "space-y-2"
              )}>
            {/* Left column: Activity Feed */}
            {preferences.showFeeds && (
              <div>
                <ActivityFeed
                  feedFilters={feedFilters}
                  onFeedFiltersChange={handleFeedFiltersChange}
                  recentCheckins={recentCheckins}
                  recentCheckouts={recentCheckouts}
                  activeRepairs={activeRepairs}
                  newAssets={newAssets}
                  disposedAssets={disposedAssets}
                  lostAssets={lostAssets}
                  checkinsLoading={checkinsLoading}
                  isRefreshing={isRefreshing}
                  onRefresh={handleRefresh}
                />
              </div>
            )}

            {/* Right column: Category Pie Chart + Calendar + Quick Actions stacked */}
            <div className={cn("space-y-2 flex flex-col", !hasLeftColumn && !hasRightContent && "lg:col-span-2")}>
              {preferences.showChart && (
                assetsLoading ? (
                  <Card className="animate-fade-in flex flex-col h-[200px]">
                    <CardHeader className="pb-0 py-2 px-3 border-b">
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                      <Skeleton className="h-28 w-28 rounded-full" />
                    </CardContent>
                  </Card>
                ) : (
                  <CategoryPieChart categoryDistribution={categoryDistribution} totalAssets={totalAssets} />
                )
              )}

              {preferences.showCalendar && (
                <Card className="animate-fade-in flex flex-col" style={{ animationDelay: "100ms", animationDuration: "350ms", animationFillMode: "backwards" }}>
                  <CardHeader className="pb-0 py-2 px-3 border-b">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alert Calendar</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-2 pt-1 overflow-auto">
                    <DashboardCalendar events={calendarEvents} />
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card className="animate-fade-in" style={{ animationDelay: "160ms", animationDuration: "350ms", animationFillMode: "backwards" }}>
                <CardHeader className="py-2 px-3 border-b">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start" onClick={() => navigate("/assets/add")}>
                      <Plus className="h-3.5 w-3.5" /> Add Asset
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start" onClick={() => navigate("/assets/checkout")}>
                      <LogOut className="h-3.5 w-3.5" /> Check Out
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start" onClick={() => navigate("/assets/checkin")}>
                      <LogIn className="h-3.5 w-3.5" /> Check In
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 justify-start" onClick={() => navigate("/assets/reports")}>
                      <BarChart3 className="h-3.5 w-3.5" /> View Reports
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
            );
          })()}
        </div>
      </div>

      <ManageDashboardDialog open={manageDialogOpen} onOpenChange={setManageDialogOpen} preferences={preferences} onSave={setPreferences} />
      <DeniedAssetsDialog open={deniedDialogOpen} onOpenChange={setDeniedDialogOpen} />
    </>
  );
};

export default AssetDashboard;
