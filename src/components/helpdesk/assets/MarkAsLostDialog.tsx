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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ASSET_STATUS } from "@/lib/assetStatusUtils";

interface MarkAsLostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  onSuccess?: () => void;
}

export function MarkAsLostDialog({ open, onOpenChange, assetId, assetName, onSuccess }: MarkAsLostDialogProps) {
  const queryClient = useQueryClient();
  const [brokenDate, setBrokenDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");

  const markAsBrokenMutation = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Get tenant_id from the asset
      const { data: assetData } = await supabase
        .from("itam_assets")
        .select("tenant_id, status")
        .eq("id", assetId)
        .single();

      // Update asset status to lost
      const { error: assetError } = await supabase
        .from("itam_assets")
        .update({ 
          status: ASSET_STATUS.LOST,
          // Clear assignment fields since it's lost/broken
          assigned_to: null,
          checked_out_to: null,
          checked_out_at: null,
          expected_return_date: null,
          check_out_notes: null,
        })
        .eq("id", assetId);
      
      if (assetError) throw assetError;

      // Log to history
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "marked_as_broken",
        old_value: assetData?.status,
        new_value: ASSET_STATUS.LOST,
        details: { 
          broken_date: brokenDate.toISOString(),
          notes,
        },
        performed_by: currentUser?.id,
        tenant_id: assetData?.tenant_id,
      });
    },
    onSuccess: () => {
      toast.success("Asset marked as broken");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
      queryClient.invalidateQueries({ queryKey: ["itam-asset-detail"] });
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setBrokenDate(new Date());
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to mark asset as broken");
      console.error(error);
    },
  });

  const handleSubmit = () => {
    markAsBrokenMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Broken Asset</DialogTitle>
          <DialogDescription>
            Mark "{assetName}" as broken or lost.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Date Broken <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(brokenDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={brokenDate}
                  onSelect={(date) => date && setBrokenDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the circumstances..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
          <Button 
            onClick={handleSubmit} 
            disabled={markAsBrokenMutation.isPending}
          >
            {markAsBrokenMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Broken
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
