import { useState, useDeferredValue, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { CalendarIcon, CalendarCheck, X, Check, ChevronsUpDown, PackageOpen, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AssetThumbnail } from "@/components/helpdesk/assets/AssetThumbnail";
import { ImagePreviewDialog } from "@/components/helpdesk/assets/ImagePreviewDialog";
import { EmptyState } from "@/components/helpdesk/assets/EmptyState";
import { AssetSearchBar } from "@/components/helpdesk/assets/AssetSearchBar";
import { cn, sanitizeSearchInput } from "@/lib/utils";
import { PaginationControls } from "@/components/helpdesk/assets/PaginationControls";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";
import { getStatusLabel } from "@/lib/assetStatusUtils";
import { SortableTableHeader, type SortConfig } from "@/components/helpdesk/SortableTableHeader";

import { FALLBACK_NAV, useAssetPageShortcuts } from "@/lib/assetHelpers";

const ReservePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [reserveFor, setReserveFor] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [notes, setNotes] = useState("");
  const [userComboOpen, setUserComboOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 200;

  const { data: assets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["itam-assets-for-reservation", deferredSearch],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name), make:itam_makes!make_id(name)")
        .eq("is_active", true)
        .eq("status", "available")
        .order("name");

      if (deferredSearch) {
        const s = sanitizeSearchInput(deferredSearch);
        query = query.or(`name.ilike.%${s}%,asset_tag.ilike.%${s}%,asset_id.ilike.%${s}%,serial_number.ilike.%${s}%,model.ilike.%${s}%`);
      }

      const { data, error: queryError } = await query.limit(5000);
      if (queryError) throw queryError;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-for-reservation"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentReservations = [] } = useQuery({
    queryKey: ["itam-recent-reservations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_asset_reservations")
        .select("*, asset:itam_assets(name, asset_tag, asset_id)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!data || data.length === 0) return [];

      const userIds = [...new Set([...data.map(d => d.reserved_for), ...data.map(d => d.reserved_by)].filter(Boolean))] as string[];
      let userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from("users").select("id, auth_user_id, name, email").or(`id.in.(${userIds.join(",")}),auth_user_id.in.(${userIds.join(",")})`);
        (usersData || []).forEach(u => {
          userMap.set(u.id, u.name || u.email || u.id);
          if (u.auth_user_id) userMap.set(u.auth_user_id, u.name || u.email || u.id);
        });
      }

      return data.map(d => ({
        ...d,
        reserved_for_display: d.reserved_for ? (userMap.get(d.reserved_for) || d.reserved_for_name || "—") : "—",
      }));
    },
    staleTime: 30_000,
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) throw new Error("Please select an asset");
      if (!reserveFor) throw new Error("Please select a person to reserve for");
      if (endDate <= startDate) throw new Error("End date must be after start date");

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Resolve auth UUID to users table ID for reserved_by
      let reservedByUserId = currentUser?.id;
      if (currentUser?.id) {
        const { data: userRecord } = await supabase
          .from("users")
          .select("id")
          .eq("auth_user_id", currentUser.id)
          .maybeSingle();
        if (userRecord) reservedByUserId = userRecord.id;
      }

      const { error } = await supabase
        .from("itam_asset_reservations")
        .insert({
          asset_id: selectedAsset,
          reserved_for: reserveFor,
          reserved_by: reservedByUserId,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          purpose: notes || null,
          status: "pending",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset reserved successfully");
      invalidateAllAssetQueries(queryClient);
      setShowSuccess(true);
      setTimeout(() => navigate(FALLBACK_NAV), 1200);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reserve asset");
    },
  });

  const handleReserve = () => setConfirmOpen(true);
  const confirmReserve = () => {
    setConfirmOpen(false);
    reserveMutation.mutate();
  };

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column
        ? prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc"
        : "asc",
    }));
  }, []);

  const sortedAssets = useMemo(() => {
    if (!sortConfig.direction) return assets;
    const sorted = [...assets].sort((a: any, b: any) => {
      let aVal: string, bVal: string;
      switch (sortConfig.column) {
        case "asset_tag": aVal = a.asset_tag || a.asset_id || ""; bVal = b.asset_tag || b.asset_id || ""; break;
        case "name": aVal = a.name || ""; bVal = b.name || ""; break;
        case "category": aVal = a.category?.name || ""; bVal = b.category?.name || ""; break;
        default: aVal = ""; bVal = "";
      }
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
      return sortConfig.direction === "desc" ? -cmp : cmp;
    });
    return sorted;
  }, [assets, sortConfig]);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [deferredSearch]);

  const totalPages = Math.ceil(sortedAssets.length / ITEMS_PER_PAGE);
  const paginatedAssets = sortedAssets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const selectedAssetData = assets.find(a => a.id === selectedAsset);
  const selectedUser = users.find(u => u.id === reserveFor);
  const canReserve = !!selectedAsset && !!reserveFor && !reserveMutation.isPending;

  // Keyboard shortcuts
  useAssetPageShortcuts({
    canConfirm: canReserve,
    dialogOpen: confirmOpen,
    onConfirm: handleReserve,
  });

  // Loading is handled inline with skeleton rows

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {isError && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/20">
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          <p className="text-xs text-destructive">Failed to load assets.</p>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden p-3">
        <div className="flex gap-3 h-full">
          {/* Asset Selection */}
          <Card className="flex-1 min-w-0 flex flex-col min-h-0 shadow-none border">
            <CardHeader className="pb-2 px-3 pt-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AssetSearchBar
                      value={search}
                      onChange={setSearch}
                      placeholder="Search tag, name, ID..."
                      ariaLabel="Search available assets"
                    />
                  <Badge variant="outline" className="text-xs h-5 gap-1 flex-shrink-0">
                    {sortedAssets.length} available
                  </Badge>
                </div>
                {selectedAssetData && (
                  <Badge variant="default" className="text-xs h-5 gap-1 flex-shrink-0">
                    1 selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 min-h-0 p-0">
              {selectedAssetData && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-primary/5">
                  <span className="text-xs font-medium">Selected:</span>
                  <Badge variant="default" className="gap-1 text-xs h-5">
                    {selectedAssetData.asset_tag || selectedAssetData.name}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedAsset(null)} />
                  </Badge>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-auto">
                <Table className="table-fixed" wrapperClassName="border-0 rounded-none">
                  <colgroup>
                    <col className="w-[44px]" />
                    <col className="w-[36px]" />
                    <col className="w-[120px]" />
                    <col />
                    <col className="w-[100px]" />
                    <col className="w-[80px]" />
                  </colgroup>
                  <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="text-xs font-medium px-2 h-8">#</TableHead>
                      <SortableTableHeader label="" column="" sortConfig={sortConfig} onSort={() => {}} className="w-8" />
                      <SortableTableHeader label="Tag/ID" column="asset_tag" sortConfig={sortConfig} onSort={handleSort} />
                      <SortableTableHeader label="Name" column="name" sortConfig={sortConfig} onSort={handleSort} />
                      <SortableTableHeader label="Category" column="category" sortConfig={sortConfig} onSort={handleSort} />
                      <TableHead className="text-xs font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={`skel-${i}`} className="h-9">
                          <TableCell className="py-1 px-2"><Skeleton className="h-3 w-6" /></TableCell>
                          <TableCell className="py-1 px-2"><Skeleton className="h-6 w-6 rounded" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-3 w-20" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-3 w-24" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-3 w-16" /></TableCell>
                          <TableCell className="py-1"><Skeleton className="h-4 w-12" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedAssets.map((asset, index) => (
                      <TableRow
                        key={asset.id}
                        className={cn(
                          "cursor-pointer h-9 transition-colors",
                          selectedAsset === asset.id && "bg-primary/10",
                          index % 2 === 1 && selectedAsset !== asset.id && "bg-muted/30"
                        )}
                        onClick={() => setSelectedAsset(asset.id)}
                      >
                        <TableCell className="text-xs text-muted-foreground py-1 px-2">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell className="py-1 px-2">
                          <AssetThumbnail
                            url={(asset as any).custom_fields?.photo_url}
                            name={asset.name}
                            onClick={() => {
                              const url = (asset as any).custom_fields?.photo_url;
                              if (url) setPreviewImage({ url, name: asset.name });
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-xs py-1">
                          <span
                            className="text-primary hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/assets/detail/${asset.id}`);
                            }}
                          >
                            {asset.asset_tag || asset.asset_id}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-1 font-medium">{asset.name}</TableCell>
                        <TableCell className="text-xs py-1">{(asset.category as any)?.name || "—"}</TableCell>
                        <TableCell className="py-1">
                          <Badge variant="secondary" className="text-[10px] h-4">{getStatusLabel(asset.status)}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && sortedAssets.length === 0 && (
                      <TableRow>
                      <TableCell colSpan={6} className="text-center p-0">
                          <EmptyState
                            title="No available assets"
                            search={search}
                            onClearSearch={() => setSearch("")}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedAssets.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>

          {/* Right sidebar */}
          <div className="w-[340px] flex-shrink-0 flex flex-col gap-3 min-h-0 overflow-auto">
            {/* Reservation Form */}
            <Card className="shadow-none border">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Reservation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2.5">
                <div className="space-y-1">
                  <Label className="text-xs">Reserve For *</Label>
                  <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-8 text-xs">
                        {selectedUser ? (selectedUser.name || selectedUser.email) : "Select person..."}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
                      <Command>
                        <CommandInput placeholder="Search users..." className="h-8 text-xs" />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.name || ""} ${user.email}`}
                                onSelect={() => { setReserveFor(user.id); setUserComboOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-3 w-3", reserveFor === user.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span className="text-xs">{user.name || user.email}</span>
                                  {user.name && <span className="text-[10px] text-muted-foreground">{user.email}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {format(startDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {format(endDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus disabled={(date) => date < startDate} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    placeholder="Purpose of reservation..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="text-xs resize-none min-h-[48px]"
                  />
                </div>

                <div className="border-t pt-2 flex gap-2">
                  <Button
                    className="flex-1 h-8 text-xs"
                    onClick={handleReserve}
                    disabled={!canReserve || showSuccess}
                  >
                    {showSuccess ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done!</>
                    ) : reserveMutation.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Processing...</>
                    ) : (
                      "Reserve Asset"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => navigate(FALLBACK_NAV)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Reservations */}
            <Card className="shadow-none border flex-1 min-h-0 flex flex-col">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-semibold">Recent Reservations</CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
                <Table wrapperClassName="border-0 rounded-none">
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-medium">Asset</TableHead>
                      <TableHead className="text-[10px] font-medium">For</TableHead>
                      <TableHead className="text-[10px] font-medium">Status</TableHead>
                      <TableHead className="text-[10px] font-medium">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReservations.map((r: any) => (
                      <TableRow key={r.id} className="h-8">
                        <TableCell className="text-xs py-1">
                          <span
                            className="text-primary hover:underline cursor-pointer"
                            onClick={() => navigate(`/assets/detail/${r.asset_id}`)}
                          >
                            {r.asset?.asset_tag || r.asset?.name || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-1">{r.reserved_for_display}</TableCell>
                        <TableCell className="py-1">
                          <Badge variant="outline" className="text-[10px] h-4">{r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1">
                          {r.start_date ? format(new Date(r.start_date), "MMM dd") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentReservations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-xs text-muted-foreground">
                          No recent reservations
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ImagePreviewDialog image={previewImage} onClose={() => setPreviewImage(null)} />

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Reserve <strong>{selectedAssetData?.asset_tag || selectedAssetData?.name}</strong> for{" "}
              <strong>{selectedUser?.name || selectedUser?.email}</strong> from{" "}
              {format(startDate, "MMM d, yyyy")} to {format(endDate, "MMM d, yyyy")}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReserve} disabled={reserveMutation.isPending}>
              {reserveMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Processing...</> : "Reserve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReservePage;
