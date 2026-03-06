import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Plus, Settings, FileSpreadsheet, CheckSquare, UserCheck, Wrench, Package, Trash2 } from "lucide-react";
import { sanitizeSearchInput } from "@/lib/utils";
import { AssetsList } from "@/components/helpdesk/assets/AssetsList";
import { AssetColumnSettings } from "@/components/helpdesk/assets/AssetColumnSettings";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ASSET_STATUS_OPTIONS } from "@/lib/assetStatusUtils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AllAssets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, any>>({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || null,
    type: null,
    warranty: searchParams.get("warranty") || null,
    recent: searchParams.get("recent") || null,
    confirmation: searchParams.get("confirmation") || null,
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkActions, setBulkActions] = useState<any>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchParams.get("search") || "");
  const { categories } = useAssetSetupConfig();
  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; action: () => void; variant: "default" | "destructive";
  }>({ open: false, title: "", description: "", action: () => {}, variant: "default" });

  // Sync portal target directly (no useEffect delay)
  const portalTarget = document.getElementById("module-header-portal");

  // Sync URL params to filters
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || null;
    const warranty = searchParams.get("warranty") || null;
    const recent = searchParams.get("recent") || null;
    const confirmation = searchParams.get("confirmation") || null;
    setFilters(prev => ({ ...prev, search, status, warranty, recent, confirmation }));
    setLocalSearch(search);
  }, [searchParams]);

  // Clear selection when exiting bulk select mode
  useEffect(() => {
    if (!bulkSelectMode) { setSelectedAssetIds([]); setBulkActions(null); }
  }, [bulkSelectMode]);

  const handleSearchChange = (value: string) => {
    const sanitized = sanitizeSearchInput(value);
    setFilters(prev => ({ ...prev, search: sanitized }));
    if (sanitized) { searchParams.set("search", sanitized); } else { searchParams.delete("search"); }
    setSearchParams(searchParams, { replace: true });
  };

  // Debounced live search (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChangeRef = useRef(handleSearchChange);
  handleSearchChangeRef.current = handleSearchChange;

  const handleLocalSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearchChangeRef.current(value.trim());
    }, 300);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    handleSearchChange(localSearch.trim());
  };

  const handleSearchClear = () => {
    setLocalSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    handleSearchChange("");
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

  const handleConfirmationChange = (value: string) => {
    const confirmation = value === "all" ? null : value;
    setFilters(prev => ({ ...prev, confirmation }));
    if (confirmation) { searchParams.set("confirmation", confirmation); } else { searchParams.delete("confirmation"); }
    setSearchParams(searchParams, { replace: true });
  };

  const clearFilters = () => {
    setFilters({ search: "", status: null, type: null, typeName: null, warranty: null, recent: null, confirmation: null });
    setSearchParams({}, { replace: true });
    setLocalSearch("");
  };

  const hasActiveFilters = filters.search || filters.status || filters.type || filters.warranty || filters.recent || filters.confirmation;

  const headerContent = (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={localSearch}
          onChange={(e) => handleLocalSearchChange(e.target.value)}
          className="pl-7 pr-7 h-7 w-[280px] text-xs"
        />
        {localSearch && (
          <Button type="button" variant="ghost" size="icon" onClick={handleSearchClear} className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5">
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
        <SelectTrigger className="w-[160px] h-7 text-xs">
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
        <SelectTrigger className="w-[160px] h-7 text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.confirmation || "all"} onValueChange={handleConfirmationChange}>
        <SelectTrigger className="w-[160px] h-7 text-xs">
          <SelectValue placeholder="Confirmation" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Verification</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="denied">Denied</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
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
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuItem onClick={() => setColumnSettingsOpen(true)}>
              <Settings className="mr-2 h-3.5 w-3.5" />
              Customize Columns
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/assets/import-export")}>
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
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Check Out Assets",
                  description: `Are you sure you want to check out ${selectedAssetIds.length} asset(s)? This will mark them as in use. Note: Bulk check-out does not assign to a specific user. Use the individual check-out action to assign assets.`,
                  action: bulkActions.handleCheckOut,
                  variant: "default",
                })}>
                  <UserCheck className="mr-2 h-3.5 w-3.5" />Check Out ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Check In Assets",
                  description: `Are you sure you want to check in ${selectedAssetIds.length} asset(s)? This will mark them as available and close any open assignments.`,
                  action: bulkActions.handleCheckIn,
                  variant: "default",
                })}>
                  <UserCheck className="mr-2 h-3.5 w-3.5" />Check In ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Send for Repair",
                  description: `Are you sure you want to send ${selectedAssetIds.length} asset(s) for repair/maintenance?`,
                  action: bulkActions.handleMaintenance,
                  variant: "default",
                })}>
                  <Wrench className="mr-2 h-3.5 w-3.5" />Repair ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Dispose Assets",
                  description: `Are you sure you want to dispose ${selectedAssetIds.length} asset(s)? This will mark them as disposed.`,
                  action: bulkActions.handleDispose,
                  variant: "destructive",
                })}>
                  <Package className="mr-2 h-3.5 w-3.5" />Dispose ({selectedAssetIds.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmDialog({
                  open: true,
                  title: "Delete Assets",
                  description: `Are you sure you want to delete ${selectedAssetIds.length} asset(s)? This action can be reversed by an administrator.`,
                  action: bulkActions.handleDelete,
                  variant: "destructive",
                })} className="text-destructive">
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

      {/* Bulk selection indicator bar */}
      {bulkSelectMode && selectedAssetIds.length > 0 && (
        <div className="px-3 py-1.5 bg-primary/10 border-b border-primary/20 flex items-center gap-2 text-xs">
          <CheckSquare className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-primary">{selectedAssetIds.length} asset{selectedAssetIds.length !== 1 ? 's' : ''} selected</span>
          <Button variant="ghost" size="sm" className="h-5 px-2 text-xs ml-auto" onClick={() => setBulkSelectMode(false)}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      <div className="px-3 py-2 flex-1 overflow-hidden flex flex-col">
        <AssetsList
          filters={filters}
          showSelection={bulkSelectMode}
          onSelectionChange={(selectedIds, actions) => {
            setSelectedAssetIds(selectedIds);
            setBulkActions(actions);
          }}
        />
      </div>

      <AssetColumnSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
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
