import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Plus, ChevronDown, Settings, FileSpreadsheet, CheckSquare, UserCheck, Wrench, Package, Trash2 } from "lucide-react";
import { AssetsList } from "@/components/helpdesk/assets/AssetsList";
import { AssetColumnSettings, SYSTEM_COLUMN_ORDER } from "@/components/helpdesk/assets/AssetColumnSettings";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ASSET_STATUS_OPTIONS } from "@/lib/assetStatusUtils";
import { useUISettings } from "@/hooks/useUISettings";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";

// XLSX export utility (same as AssetModuleTopBar)
const exportToXLSX = (data: any[], filename: string, columns: { id: string; label: string }[]) => {
  if (!data || data.length === 0) { toast.error("No data to export"); return; }
  const resolveValue = (item: any, colId: string): string => {
    switch (colId) {
      case "asset_tag": return item.asset_tag || "";
      case "category": return item.category?.name || "";
      case "status": return item.status || "";
      case "make": return item.make?.name || "";
      case "model": return item.model || "";
      case "serial_number": return item.serial_number || "";
      case "assigned_to": return item.assigned_user?.name || item.assigned_user?.email || item.assigned_to || "";
      case "location": return item.location?.name || "";
      case "site": return item.location?.site?.name || "";
      case "department": return item.department?.name || "";
      case "cost": return item.purchase_price?.toString() || "";
      case "purchase_date": return item.purchase_date || "";
      case "purchased_from": return item.vendor?.name || "";
      case "description": return item.description || "";
      case "created_at": return item.created_at || "";
      case "created_by": return item.created_user?.name || item.created_user?.email || item.created_by || "";
      default: return "";
    }
  };
  const rows = data.map(item => {
    const row: Record<string, string> = {};
    columns.forEach(col => { row[col.label] = resolveValue(item, col.id); });
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Assets");
  XLSX.writeFile(wb, `${filename}.xlsx`);
  toast.success(`Exported ${data.length} records to ${filename}.xlsx`);
};

export default function AllAssets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, any>>({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || null,
    type: null,
    warranty: searchParams.get("warranty") || null,
    recent: searchParams.get("recent") || null,
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkActions, setBulkActions] = useState<any>(null);
  const [assetsData, setAssetsData] = useState<any[]>([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get("search") || "");
  const { categories } = useAssetSetupConfig();
  const { assetColumns: savedColumns } = useUISettings();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; action: () => void; variant: "default" | "destructive";
  }>({ open: false, title: "", description: "", action: () => {}, variant: "default" });

  // Find portal target
  useEffect(() => {
    const el = document.getElementById("helpdesk-header-left");
    setPortalTarget(el);
  }, []);

  // Sync URL params to filters
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || null;
    const warranty = searchParams.get("warranty") || null;
    const recent = searchParams.get("recent") || null;
    setFilters(prev => ({ ...prev, search, status, warranty, recent }));
    setLocalSearch(search);
  }, [searchParams]);

  // Clear selection when exiting bulk select mode
  useEffect(() => {
    if (!bulkSelectMode) { setSelectedAssetIds([]); setBulkActions(null); }
  }, [bulkSelectMode]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    if (value) { searchParams.set("search", value); } else { searchParams.delete("search"); }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) handleSearchChange(localSearch.trim());
  };

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? null : value;
    setFilters(prev => ({ ...prev, status }));
    if (status) { searchParams.set("status", status); } else { searchParams.delete("status"); }
    setSearchParams(searchParams, { replace: true });
  };

  const handleTypeChange = (value: string) => {
    const selectedCategory = value === "all" ? null : categories.find(c => c.name === value);
    setFilters(prev => ({ ...prev, type: selectedCategory?.id || null, typeName: value === "all" ? null : value }));
  };

  const clearFilters = () => {
    setFilters({ search: "", status: null, type: null, typeName: null, warranty: null, recent: null });
    setSearchParams({}, { replace: true });
    setLocalSearch("");
  };

  const getVisibleColumnsForExport = () => {
    const columns = savedColumns && savedColumns.length > 0
      ? SYSTEM_COLUMN_ORDER.map(systemCol => {
          const savedCol = savedColumns.find(c => c.id === systemCol.id);
          return savedCol ? { ...systemCol, visible: savedCol.visible } : systemCol;
        })
      : [...SYSTEM_COLUMN_ORDER];
    return columns.filter(c => c.visible).sort((a, b) => a.order_index - b.order_index);
  };

  const handleExportToExcel = () => {
    const visibleColumns = getVisibleColumnsForExport();
    if (assetsData.length > 0) { exportToXLSX(assetsData, "assets-export", visibleColumns); }
    else { toast.info("No data available to export. Load assets first."); }
  };

  const hasActiveFilters = filters.search || filters.status || filters.type || filters.warranty || filters.recent;

  const headerContent = (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-7 pr-7 h-7 w-[180px] text-xs"
        />
        {localSearch && (
          <Button type="button" variant="ghost" size="icon" onClick={() => setLocalSearch("")} className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5">
            <X className="h-3 w-3" />
          </Button>
        )}
      </form>

      {/* Add Asset */}
      <Button size="sm" onClick={() => navigate("/assets/add")} className="gap-1 h-7 px-3">
        <Plus className="h-3.5 w-3.5" />
        <span className="text-xs">Add Asset</span>
      </Button>

      {/* Filters */}
      <Select value={filters.status || "all"} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[120px] h-7 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {ASSET_STATUS_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.typeName || "all"} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[120px] h-7 text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 text-xs px-2">
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}

      {/* Actions - pushed to the right */}
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              Actions
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuItem onClick={() => setColumnSettingsOpen(true)}>
              <Settings className="mr-2 h-3.5 w-3.5" />
              Customize Columns
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportToExcel}>
              <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBulkSelectMode(!bulkSelectMode)}>
              <CheckSquare className="mr-2 h-3.5 w-3.5" />
              {bulkSelectMode ? "Exit Bulk Select" : "Bulk Select"}
            </DropdownMenuItem>
            {bulkSelectMode && selectedAssetIds.length > 0 && bulkActions && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={bulkActions.handleCheckOut}>
                  <UserCheck className="mr-2 h-3.5 w-3.5" />Check Out ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={bulkActions.handleCheckIn}>
                  <UserCheck className="mr-2 h-3.5 w-3.5" />Check In ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={bulkActions.handleMaintenance}>
                  <Wrench className="mr-2 h-3.5 w-3.5" />Maintenance ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={bulkActions.handleDispose}>
                  <Package className="mr-2 h-3.5 w-3.5" />Dispose ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={bulkActions.handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />Delete ({selectedAssetIds.length})
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Portal toolbar into layout header */}
      {portalTarget && createPortal(headerContent, portalTarget)}

      <div className="px-3 py-2 flex-1 overflow-hidden flex flex-col">
        <AssetsList
          filters={filters}
          showSelection={bulkSelectMode}
          onSelectionChange={(selectedIds, actions) => {
            setSelectedAssetIds(selectedIds);
            setBulkActions(actions);
          }}
          onDataLoad={(data) => setAssetsData(data)}
        />
      </div>

      <AssetColumnSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        onColumnsChange={() => {}}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={() => { confirmDialog.action(); setConfirmDialog(prev => ({ ...prev, open: false })); }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Confirm"
        variant={confirmDialog.variant}
      />
    </div>
  );
}
