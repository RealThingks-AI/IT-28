import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";

interface RepairAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function RepairAssetDialog({ open, onOpenChange, assetId, assetName, onSuccess }: RepairAssetDialogProps) {
  const queryClient = useQueryClient();
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date());
  const [assignedTo, setAssignedTo] = useState("");
  const [completedDate, setCompletedDate] = useState<Date | undefined>();
  const [repairCost, setRepairCost] = useState("");
  const [notes, setNotes] = useState("");

  const repairMutation = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Get tenant_id from the asset
      const { data: assetData } = await supabase
        .from("itam_assets")
        .select("tenant_id")
        .eq("id", assetId)
        .single();

      // Create repair record in itam_repairs table
      const { error: repairError } = await supabase
        .from("itam_repairs")
        .insert({
          asset_id: assetId,
          status: completedDate ? "completed" : "in_progress",
          issue_description: notes || "Repair/Maintenance scheduled",
          cost: repairCost ? parseFloat(repairCost) : null,
          started_at: scheduleDate.toISOString(),
          completed_at: completedDate?.toISOString() || null,
          notes: notes || null,
          tenant_id: assetData?.tenant_id,
        });
      
      if (repairError) throw repairError;

      // Update asset status to maintenance
      const { error: assetError } = await supabase
        .from("itam_assets")
        .update({ status: ASSET_STATUS.MAINTENANCE })
        .eq("id", assetId);
      
      if (assetError) throw assetError;

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "sent_for_repair",
        details: { 
          schedule_date: scheduleDate.toISOString(),
          assigned_to: assignedTo || null,
          estimated_cost: repairCost ? parseFloat(repairCost) : null,
          notes,
        },
        performed_by: currentUser?.id,
        tenant_id: assetData?.tenant_id,
      });
    },
    onSuccess: () => {
      toast.success("Asset sent for repair/maintenance");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
      queryClient.invalidateQueries({ queryKey: ["itam-asset-detail"] });
      queryClient.invalidateQueries({ queryKey: ["itam-repairs"] });
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setScheduleDate(new Date());
      setAssignedTo("");
      setCompletedDate(undefined);
      setRepairCost("");
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to schedule repair");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    repairMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Repair Asset</DialogTitle>
          <DialogDescription>
            Schedule repair or maintenance for "{assetName}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Schedule Date <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(scheduleDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={(date) => date && setScheduleDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned to</Label>
            <Input
              id="assignedTo"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Enter technician name..."
            />
          </div>

          <div className="space-y-2">
            <Label>Date Completed</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !completedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {completedDate ? format(completedDate, "dd/MM/yyyy") : "dd/MM/yyyy"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={completedDate}
                  onSelect={setCompletedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repairCost">Repair Cost</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="repairCost"
                type="number"
                value={repairCost}
                onChange={(e) => setRepairCost(e.target.value)}
                placeholder="India Rupee"
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
          <Button 
            onClick={handleSubmit} 
            disabled={repairMutation.isPending}
          >
            {repairMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Repair
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
