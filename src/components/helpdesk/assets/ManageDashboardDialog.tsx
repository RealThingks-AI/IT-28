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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Package, CheckCircle2, DollarSign, ShoppingCart, Wrench, Trash2, FileText } from "lucide-react";

export interface DashboardWidget {
  id: string;
  label: string;
  icon: React.ElementType;
  enabled: boolean;
}

export interface DashboardPreferences {
  widgets: DashboardWidget[];
  columns: number;
  showChart: boolean;
  showFeeds: boolean;
  showAlerts: boolean;
  showCalendar: boolean;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "activeAssets", label: "Number of Active Assets", icon: Package, enabled: true },
  { id: "availableAssets", label: "Available Assets", icon: CheckCircle2, enabled: true },
  { id: "assetValue", label: "Value of Assets", icon: DollarSign, enabled: true },
  { id: "fiscalPurchases", label: "Purchases in Fiscal Year", icon: ShoppingCart, enabled: true },
  { id: "checkedOut", label: "Checked-out Assets", icon: Package, enabled: false },
  { id: "underRepair", label: "Under Repair", icon: Wrench, enabled: false },
  { id: "disposed", label: "Disposed Assets", icon: Trash2, enabled: false },
  { id: "contracts", label: "Active Contracts", icon: FileText, enabled: false },
];

const DEFAULT_PREFERENCES: DashboardPreferences = {
  widgets: DEFAULT_WIDGETS,
  columns: 4,
  showChart: true,
  showFeeds: true,
  showAlerts: true,
  showCalendar: true,
};

const STORAGE_KEY = "itam-dashboard-preferences";

export function loadDashboardPreferences(): DashboardPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure new widgets are included
      const mergedWidgets = DEFAULT_WIDGETS.map(defaultWidget => {
        const storedWidget = parsed.widgets?.find((w: DashboardWidget) => w.id === defaultWidget.id);
        return storedWidget ? { ...defaultWidget, enabled: storedWidget.enabled } : defaultWidget;
      });
      return { ...DEFAULT_PREFERENCES, ...parsed, widgets: mergedWidgets };
    }
  } catch (e) {
    console.error("Failed to load dashboard preferences:", e);
  }
  return DEFAULT_PREFERENCES;
}

export function saveDashboardPreferences(prefs: DashboardPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save dashboard preferences:", e);
  }
}

interface ManageDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: DashboardPreferences;
  onSave: (prefs: DashboardPreferences) => void;
}

export function ManageDashboardDialog({
  open,
  onOpenChange,
  preferences,
  onSave,
}: ManageDashboardDialogProps) {
  const [localPrefs, setLocalPrefs] = useState<DashboardPreferences>(preferences);

  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences, open]);

  const toggleWidget = (id: string) => {
    setLocalPrefs(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === id ? { ...w, enabled: !w.enabled } : w
      ),
    }));
  };

  const handleSave = () => {
    saveDashboardPreferences(localPrefs);
    onSave(localPrefs);
    onOpenChange(false);
    toast.success("Dashboard preferences saved");
  };

  const handleReset = () => {
    setLocalPrefs(DEFAULT_PREFERENCES);
    toast.info("Preferences reset to defaults");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Dashboard</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="widgets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="widgets">Widgets</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="widgets" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Select which widgets to display on your dashboard.
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {localPrefs.widgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <div
                    key={widget.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <Checkbox
                      id={widget.id}
                      checked={widget.enabled}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor={widget.id} className="flex-1 cursor-pointer text-sm">
                      {widget.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="layout" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Number of Columns</Label>
              <Select
                value={localPrefs.columns.toString()}
                onValueChange={(value) =>
                  setLocalPrefs(prev => ({ ...prev, columns: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-sm font-medium">Show Sections</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showChart"
                    checked={localPrefs.showChart}
                    onCheckedChange={(checked) =>
                      setLocalPrefs(prev => ({ ...prev, showChart: !!checked }))
                    }
                  />
                  <Label htmlFor="showChart" className="text-sm cursor-pointer">Asset Value Chart</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showFeeds"
                    checked={localPrefs.showFeeds}
                    onCheckedChange={(checked) =>
                      setLocalPrefs(prev => ({ ...prev, showFeeds: !!checked }))
                    }
                  />
                  <Label htmlFor="showFeeds" className="text-sm cursor-pointer">Feeds Panel</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showAlerts"
                    checked={localPrefs.showAlerts}
                    onCheckedChange={(checked) =>
                      setLocalPrefs(prev => ({ ...prev, showAlerts: !!checked }))
                    }
                  />
                  <Label htmlFor="showAlerts" className="text-sm cursor-pointer">Alerts Section</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showCalendar"
                    checked={localPrefs.showCalendar}
                    onCheckedChange={(checked) =>
                      setLocalPrefs(prev => ({ ...prev, showCalendar: !!checked }))
                    }
                  />
                  <Label htmlFor="showCalendar" className="text-sm cursor-pointer">Alert Calendar</Label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleReset} className="sm:mr-auto">
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
