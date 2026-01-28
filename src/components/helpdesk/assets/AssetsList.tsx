import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { format } from "date-fns";
import { getAssetColumnSettings, AssetColumn } from "./AssetColumnSettings";
import { AssetPhotoPreview } from "./AssetPhotoPreview";

interface AssetsListProps {
  filters?: Record<string, any>;
  onSelectionChange?: (selectedIds: string[], actions: any) => void;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn = string | null;

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function AssetsList({
  filters = {},
  onSelectionChange
}: AssetsListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [visibleColumns, setVisibleColumns] = useState<AssetColumn[]>([]);

  // Load column settings - always sorted by order_index
  useEffect(() => {
    const columns = getAssetColumnSettings();
    // Ensure columns are always sorted by order_index
    setVisibleColumns(columns.sort((a, b) => a.order_index - b.order_index));
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.type]);

  // Fetch total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["helpdesk-assets-count", filters],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,asset_tag.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
        );
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.type) {
        query = query.eq("category_id", filters.type);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000,
  });

  // Fetch paginated assets with related data
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-assets", filters, page, pageSize, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          location:itam_locations(id, name, site:itam_sites(id, name)),
          department:itam_departments(id, name),
          make:itam_makes(id, name),
          vendor:itam_vendors(id, name),
          creator:users!itam_assets_created_by_fkey(id, name)
        `)
        .eq("is_active", true)
        .range(from, to);

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,asset_tag.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
        );
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.type) {
        query = query.eq("category_id", filters.type);
      }

      // Apply sorting
      if (sortColumn && sortDirection) {
        const ascending = sortDirection === "asc";
        switch (sortColumn) {
          case "asset_tag":
          case "model":
          case "status":
          case "serial_number":
          case "description":
          case "created_at":
          case "purchase_date":
          case "assigned_to":
            query = query.order(sortColumn, { ascending });
            break;
          case "cost":
            query = query.order("purchase_price", { ascending });
            break;
          case "event_date":
            query = query.order("checked_out_at", { ascending });
            break;
          case "event_due_date":
            query = query.order("expected_return_date", { ascending });
            break;
          case "category":
            query = query.order("category_id", { ascending });
            break;
          case "location":
            query = query.order("location_id", { ascending });
            break;
          case "department":
            query = query.order("department_id", { ascending });
            break;
          case "make":
            query = query.order("make_id", { ascending });
            break;
          default:
            query = query.order("created_at", { ascending: false });
        }
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
      toast.success("Assets updated");
      setSelectedIds([]);
    },
  });

  const deleteAssets = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
      toast.success("Assets deleted");
      setSelectedIds([]);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? assets.map((a: any) => a.id) : [];
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected, bulkActions);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedIds, id]
      : selectedIds.filter((sid) => sid !== id);
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected, bulkActions);
  };

  const bulkActions = {
    handleCheckOut: () => updateStatus.mutate({ ids: selectedIds, status: "in_use" }),
    handleCheckIn: () => updateStatus.mutate({ ids: selectedIds, status: "available" }),
    handleMaintenance: () => updateStatus.mutate({ ids: selectedIds, status: "maintenance" }),
    handleDispose: () => updateStatus.mutate({ ids: selectedIds, status: "disposed" }),
    handleDelete: () => deleteAssets.mutate(selectedIds),
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      in_use: "secondary",
      maintenance: "outline",
      retired: "destructive",
      disposed: "destructive",
      lost: "destructive",
    };
    const labels: Record<string, string> = {
      available: "Available",
      in_use: "In Use",
      maintenance: "Maintenance",
      retired: "Retired",
      disposed: "Disposed",
      lost: "Lost",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status?.replace("_", " ") || "Unknown"}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "—";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return "—";
    }
  };

  // Get visible columns - sorted by order_index (fixed positions)
  const activeColumns = visibleColumns
    .filter((c) => c.visible)
    .sort((a, b) => a.order_index - b.order_index);

  // Render cell based on column ID
  const renderCell = (asset: any, columnId: string) => {
    const customFields = asset.custom_fields || {};

    switch (columnId) {
      case "asset_photo":
        const photoUrl = customFields.photo_url;
        return (
          <AssetPhotoPreview 
            photoUrl={photoUrl} 
            assetName={asset.name || asset.asset_tag} 
          />
        );

      case "asset_tag":
        return <span className="font-medium">{asset.asset_tag || "—"}</span>;

      case "make":
        return asset.make?.name || <span className="text-muted-foreground">—</span>;

      case "cost":
        return <span className="font-medium">{formatCurrency(asset.purchase_price)}</span>;

      case "created_by":
        return asset.creator?.name || <span className="text-muted-foreground">—</span>;

      case "created_at":
        return formatDate(asset.created_at);

      case "description":
        return asset.description ? (
          <span className="truncate max-w-[200px] block">{asset.description}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );

      case "model":
        return asset.model || <span className="text-muted-foreground">—</span>;

      case "purchase_date":
        return formatDate(asset.purchase_date);

      case "purchased_from":
        return asset.vendor?.name || <span className="text-muted-foreground">—</span>;

      case "serial_number":
        return asset.serial_number || <span className="text-muted-foreground">—</span>;

      case "asset_classification":
        const classification = customFields.classification;
        return classification || <span className="text-muted-foreground">—</span>;

      case "asset_configuration":
        const configuration = customFields.asset_configuration;
        return configuration || <span className="text-muted-foreground">—</span>;

      case "category":
        return asset.category?.name || <span className="text-muted-foreground">—</span>;

      case "department":
        return asset.department?.name || <span className="text-muted-foreground">—</span>;

      case "location":
        return asset.location?.name || <span className="text-muted-foreground">—</span>;

      case "site":
        return asset.location?.site?.name || <span className="text-muted-foreground">—</span>;

      case "assigned_to":
        return asset.assigned_to || <span className="text-muted-foreground">—</span>;

      case "event_date":
        return formatDate(asset.checked_out_at);

      case "event_due_date":
        return formatDate(asset.expected_return_date);

      case "event_notes":
        return asset.check_out_notes ? (
          <span className="truncate max-w-[200px] block">{asset.check_out_notes}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );

      case "status":
        return getStatusBadge(asset.status);

      default:
        return "—";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.length === assets.length && assets.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              {activeColumns.map((column) => (
                <TableHead
                  key={column.id}
                  className={`cursor-pointer select-none hover:bg-muted/50 ${
                    column.id === "cost" ? "text-right" : ""
                  }`}
                  onClick={() => handleSort(column.id)}
                >
                  <div
                    className={`flex items-center ${
                      column.id === "cost" ? "justify-end" : ""
                    }`}
                  >
                    {column.label}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={activeColumns.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset: any) => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/assets/detail/${asset.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(asset.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(asset.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  {activeColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={column.id === "cost" ? "text-right" : ""}
                    >
                      {renderCell(asset, column.id)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sticky Bottom Pagination */}
      <div className="sticky bottom-0 bg-background border-t px-6 py-2 flex items-center justify-between text-xs z-10 -mx-3 mt-4">
        <span className="text-muted-foreground">
          {assets.length === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, totalCount)} of {totalCount}
        </span>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[60px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>

            <span className="mx-1.5 text-muted-foreground">
              {page}/{totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
