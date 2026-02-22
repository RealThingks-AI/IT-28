import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { AssetsList } from "@/components/helpdesk/assets/AssetsList";
import { AssetModuleTopBar } from "@/components/helpdesk/assets/AssetModuleTopBar";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function AllAssets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, any>>({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || null,
    type: null,
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkActions, setBulkActions] = useState<any>(null);
  const [assetsData, setAssetsData] = useState<any[]>([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const { categories } = useAssetSetupConfig();

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    action: () => {},
    variant: "default",
  });

  // Sync URL params to filters
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || null;
    setFilters(prev => ({ ...prev, search, status }));
  }, [searchParams]);

  // Clear selection when exiting bulk select mode
  useEffect(() => {
    if (!bulkSelectMode) {
      setSelectedAssetIds([]);
      setBulkActions(null);
    }
  }, [bulkSelectMode]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    if (value) {
      searchParams.set("search", value);
    } else {
      searchParams.delete("search");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? null : value;
    setFilters(prev => ({ ...prev, status }));
    if (status) {
      searchParams.set("status", status);
    } else {
      searchParams.delete("status");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleTypeChange = (value: string) => {
    const selectedCategory = value === "all" ? null : categories.find(c => c.name === value);
    setFilters(prev => ({ 
      ...prev, 
      type: selectedCategory?.id || null,
      typeName: value === "all" ? null : value 
    }));
  };

  const clearFilters = () => {
    setFilters({ search: "", status: null, type: null, typeName: null });
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = filters.search || filters.status || filters.type;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <AssetModuleTopBar 
        onColumnsChange={() => {}}
        onSearch={(query) => handleSearchChange(query)}
        exportData={assetsData}
        exportFilename="assets-export"
        bulkSelectMode={bulkSelectMode}
        onBulkSelectToggle={setBulkSelectMode}
        selectedCount={selectedAssetIds.length}
        bulkActions={bulkActions}
      >
        {/* Unified Filter Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.typeName || "all"}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 text-xs px-2">
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      </AssetModuleTopBar>

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

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={() => {
          confirmDialog.action();
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Confirm"
        variant={confirmDialog.variant}
      />
    </div>
  );
}
