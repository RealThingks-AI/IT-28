import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GripVertical, RotateCcw } from "lucide-react";

export interface AssetColumn {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;
  category?: "asset" | "linking" | "event";
}

const DEFAULT_ASSET_COLUMNS: AssetColumn[] = [
  // Asset Fields
  { id: "asset_photo", label: "Asset Photo", visible: false, category: "asset" },
  { id: "asset_tag", label: "Asset Tag ID", visible: true, locked: true, category: "asset" },
  { id: "make", label: "Make", visible: true, category: "asset" },
  { id: "cost", label: "Cost", visible: true, category: "asset" },
  { id: "created_by", label: "Created By", visible: false, category: "asset" },
  { id: "created_at", label: "Date Created", visible: false, category: "asset" },
  { id: "description", label: "Description", visible: false, category: "asset" },
  { id: "model", label: "Model", visible: true, category: "asset" },
  { id: "purchase_date", label: "Purchase Date", visible: false, category: "asset" },
  { id: "purchased_from", label: "Purchased From", visible: false, category: "asset" },
  { id: "serial_number", label: "Serial No", visible: true, category: "asset" },
  { id: "asset_classification", label: "Asset Classification", visible: false, category: "asset" },
  { id: "asset_configuration", label: "Asset Configuration", visible: false, category: "asset" },
  
  // Linking Fields
  { id: "category", label: "Category", visible: true, category: "linking" },
  { id: "department", label: "Department", visible: false, category: "linking" },
  { id: "location", label: "Location", visible: true, category: "linking" },
  { id: "site", label: "Site", visible: false, category: "linking" },
  
  // Event Fields
  { id: "assigned_to", label: "Assigned To", visible: true, category: "event" },
  { id: "event_date", label: "Event Date", visible: false, category: "event" },
  { id: "event_due_date", label: "Event Due Date", visible: false, category: "event" },
  { id: "event_notes", label: "Event Notes", visible: false, category: "event" },
  { id: "status", label: "Status", visible: true, category: "event" },
];

const CATEGORY_LABELS: Record<string, string> = {
  asset: "Asset Fields",
  linking: "Linking Fields",
  event: "Event Fields",
};

const STORAGE_KEY = "asset-column-settings";

interface AssetColumnSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColumnsChange?: (columns: AssetColumn[]) => void;
}

export function AssetColumnSettings({ open, onOpenChange, onColumnsChange }: AssetColumnSettingsProps) {
  const [columns, setColumns] = useState<AssetColumn[]>([]);

  // Load saved columns on mount
  useEffect(() => {
    const savedColumns = localStorage.getItem(STORAGE_KEY);
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        // Merge with defaults to handle new columns added after user saved
        const merged = DEFAULT_ASSET_COLUMNS.map(defaultCol => {
          const saved = parsed.find((c: AssetColumn) => c.id === defaultCol.id);
          return saved ? { ...defaultCol, visible: saved.visible } : defaultCol;
        });
        setColumns(merged);
      } catch {
        setColumns([...DEFAULT_ASSET_COLUMNS]);
      }
    } else {
      setColumns([...DEFAULT_ASSET_COLUMNS]);
    }
  }, [open]);

  const handleToggle = (columnId: string, checked: boolean) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId && !col.locked
          ? { ...col, visible: checked }
          : col
      )
    );
  };

  const handleReset = () => {
    setColumns([...DEFAULT_ASSET_COLUMNS]);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    onColumnsChange?.(columns);
    onOpenChange(false);
  };

  const handleShowAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const handleHideAll = () => {
    setColumns(prev =>
      prev.map(col => (col.locked ? col : { ...col, visible: false }))
    );
  };

  const visibleCount = columns.filter(c => c.visible).length;

  // Group columns by category
  const groupedColumns = columns.reduce((acc, col) => {
    const category = col.category || "asset";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(col);
    return acc;
  }, {} as Record<string, AssetColumn[]>);

  const categoryOrder = ["asset", "linking", "event"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Setup Columns</span>
            <span className="text-sm font-normal text-muted-foreground">
              {visibleCount} of {columns.length} visible
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={handleShowAll}>
            Show All
          </Button>
          <Button variant="outline" size="sm" onClick={handleHideAll}>
            Hide All
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto gap-1">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {categoryOrder.map((category) => {
              const categoryColumns = groupedColumns[category] || [];
              if (categoryColumns.length === 0) return null;
              
              return (
                <div key={category}>
                  <div className="sticky top-0 bg-background py-1.5 mb-2 border-b">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {categoryColumns.map((column) => (
                      <div
                        key={column.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                        <Checkbox
                          id={`col-${column.id}`}
                          checked={column.visible}
                          onCheckedChange={(checked) => handleToggle(column.id, !!checked)}
                          disabled={column.locked}
                        />
                        <Label
                          htmlFor={`col-${column.id}`}
                          className={`flex-1 cursor-pointer ${column.locked ? "text-muted-foreground" : ""}`}
                        >
                          {column.label}
                          {column.locked && (
                            <span className="ml-2 text-xs text-muted-foreground">(required)</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export helper to get current column settings
export function getAssetColumnSettings(): AssetColumn[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return DEFAULT_ASSET_COLUMNS.map(defaultCol => {
        const savedCol = parsed.find((c: AssetColumn) => c.id === defaultCol.id);
        return savedCol ? { ...defaultCol, visible: savedCol.visible } : defaultCol;
      });
    } catch {
      return [...DEFAULT_ASSET_COLUMNS];
    }
  }
  return [...DEFAULT_ASSET_COLUMNS];
}

export { DEFAULT_ASSET_COLUMNS };
