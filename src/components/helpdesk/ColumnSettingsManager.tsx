import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Columns, GripVertical, RotateCcw, Save, Check } from "lucide-react";
import { toast } from "sonner";

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "ticket_number", label: "ID", visible: true, order: 0 },
  { id: "title", label: "Subject", visible: true, order: 1 },
  { id: "status", label: "Status", visible: true, order: 2 },
  { id: "priority", label: "Priority", visible: true, order: 3 },
  { id: "category", label: "Category", visible: true, order: 4 },
  { id: "assignee", label: "Assignee", visible: true, order: 5 },
  { id: "requester", label: "Requester", visible: true, order: 6 },
  { id: "created_at", label: "Created", visible: true, order: 7 },
  { id: "updated_at", label: "Updated", visible: false, order: 8 },
  { id: "sla_due_date", label: "SLA Due", visible: false, order: 9 },
  { id: "tags", label: "Tags", visible: false, order: 10 },
  { id: "queue", label: "Queue", visible: false, order: 11 },
];

const STORAGE_KEY = "helpdesk_column_settings";

export const ColumnSettingsManager = () => {
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new columns
        const merged = DEFAULT_COLUMNS.map(defaultCol => {
          const savedCol = parsed.find((c: ColumnConfig) => c.id === defaultCol.id);
          return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
        });
        setColumns(merged.sort((a, b) => a.order - b.order));
      } catch {
        setColumns([...DEFAULT_COLUMNS]);
      }
    } else {
      setColumns([...DEFAULT_COLUMNS]);
    }
  }, []);

  const toggleColumn = (id: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    );
    setHasChanges(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newColumns = [...columns];
    const draggedItem = newColumns[draggedIndex];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedItem);
    
    // Update order values
    newColumns.forEach((col, i) => {
      col.order = i;
    });
    
    setColumns(newColumns);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    setHasChanges(false);
    toast.success("Column settings saved");
    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('columnSettingsChanged', { detail: columns }));
  };

  const resetToDefault = () => {
    setColumns([...DEFAULT_COLUMNS]);
    localStorage.removeItem(STORAGE_KEY);
    setHasChanges(false);
    toast.success("Reset to default columns");
    window.dispatchEvent(new CustomEvent('columnSettingsChanged', { detail: DEFAULT_COLUMNS }));
  };

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Column Settings</CardTitle>
              <CardDescription className="mt-1">
                {visibleCount} of {columns.length} columns visible
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefault}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" onClick={saveSettings} disabled={!hasChanges}>
              {hasChanges ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Toggle columns on/off and drag to reorder. Changes apply to the ticket list view.
        </p>
        
        <div className="space-y-2">
          {columns.map((column, index) => (
            <div
              key={column.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                draggedIndex === index 
                  ? 'bg-primary/5 border-primary' 
                  : 'bg-background hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <Label 
                  htmlFor={`col-${column.id}`}
                  className={`cursor-pointer ${!column.visible ? 'text-muted-foreground' : ''}`}
                >
                  {column.label}
                </Label>
              </div>
              <Switch
                id={`col-${column.id}`}
                checked={column.visible}
                onCheckedChange={() => toggleColumn(column.id)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Preview</h4>
          <div className="flex flex-wrap gap-2">
            {columns
              .filter(c => c.visible)
              .map(col => (
                <span 
                  key={col.id}
                  className="px-2 py-1 bg-background border rounded text-xs font-medium"
                >
                  {col.label}
                </span>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const getColumnSettings = (): ColumnConfig[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved).sort((a: ColumnConfig, b: ColumnConfig) => a.order - b.order);
    } catch {
      return DEFAULT_COLUMNS;
    }
  }
  return DEFAULT_COLUMNS;
};
