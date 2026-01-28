import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Settings, FileSpreadsheet, Settings2, Search, X } from "lucide-react";
import { AssetColumnSettings } from "./AssetColumnSettings";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AssetModuleTopBarProps {
  onColumnsChange?: () => void;
  onManageDashboard?: () => void;
  onSearch?: (query: string) => void;
  showColumnSettings?: boolean;
  showExport?: boolean;
  children?: React.ReactNode;
}

export function AssetModuleTopBar({ 
  onColumnsChange, 
  onManageDashboard, 
  onSearch, 
  showColumnSettings = true, 
  showExport = true, 
  children 
}: AssetModuleTopBarProps) {
  const navigate = useNavigate();
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");

  const handleExportToExcel = () => {
    toast.info("Export feature coming soon");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      if (onSearch) {
        onSearch(localSearch.trim());
      } else {
        navigate(`/assets/allassets?search=${encodeURIComponent(localSearch.trim())}`);
      }
    }
  };

  const handleClearSearch = () => {
    setLocalSearch("");
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-6 py-3">
          {/* Left side - Search and Add Asset */}
          <div className="flex items-center gap-2">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-7 pr-7 h-7 w-[180px] text-xs"
              />
              {localSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearSearch}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </form>

            {/* Add Asset Button */}
            <Button
              size="sm"
              onClick={() => navigate("/assets/add")}
              className="gap-1 h-7 px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">Add Asset</span>
            </Button>
          </div>

          {/* Middle - Children (filters from parent pages) */}
          {children}

          {/* Right side - Icon buttons */}
          <div className="flex items-center gap-1 ml-auto">
            <TooltipProvider delayDuration={300}>
              {/* Setup Columns Button - only show when relevant */}
              {showColumnSettings && onColumnsChange && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setColumnSettingsOpen(true)}
                      className="h-7 w-7"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Setup columns</TooltipContent>
                </Tooltip>
              )}

              {/* Manage Dashboard Button */}
              {onManageDashboard && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onManageDashboard}
                      className="h-7 w-7"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Manage Dashboard</TooltipContent>
                </Tooltip>
              )}

              {/* Export to Excel Button - only show when relevant */}
              {showExport && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExportToExcel}
                      className="h-7 w-7"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Export to Excel</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>

      <AssetColumnSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        onColumnsChange={() => onColumnsChange?.()}
      />
    </>
  );
}
