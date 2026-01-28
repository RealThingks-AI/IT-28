import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";

interface EditAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: any;
}

export function EditAssetDialog({ open, onOpenChange, asset }: EditAssetDialogProps) {
  const queryClient = useQueryClient();
  const { categories, sites, locations, makes } = useAssetSetupConfig();

  const [formData, setFormData] = useState({
    name: "",
    asset_tag: "",
    category: "",
    status: "available",
    location: "",
    make: "",
    model: "",
    serial_number: "",
    cost: "",
    notes: "",
  });

  useEffect(() => {
    if (asset && open) {
      setFormData({
        name: asset.name || "",
        asset_tag: asset.asset_tag || "",
        category: asset.category?.name || "",
        status: asset.status || "available",
        location: asset.location?.name || "",
        make: asset.make?.name || "",
        model: asset.model || "",
        serial_number: asset.serial_number || "",
        cost: asset.purchase_price?.toString() || "",
        notes: asset.notes || "",
      });
    }
  }, [asset, open]);

  // Helper functions to look up IDs from names
  const getCategoryId = (name: string) => categories.find(c => c.name === name)?.id || null;
  const getLocationId = (name: string) => locations.find(l => l.name === name)?.id || null;
  const getMakeId = (name: string) => makes.find(m => m.name === name)?.id || null;

  const updateAsset = useMutation({
    mutationFn: async () => {
      if (!asset?.id) throw new Error("No asset selected");

      const { error } = await supabase
        .from("itam_assets")
        .update({
          name: formData.name,
          asset_tag: formData.asset_tag || null,
          category_id: getCategoryId(formData.category),
          status: formData.status,
          location_id: getLocationId(formData.location),
          make_id: getMakeId(formData.make),
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          purchase_price: formData.cost ? parseFloat(formData.cost) : null,
          notes: formData.notes || null,
        })
        .eq("id", asset.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset updated successfully");
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-detail"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to update asset: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter an asset name");
      return;
    }
    updateAsset.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-asset_tag">Asset Tag</Label>
              <Input
                id="edit-asset_tag"
                value={formData.asset_tag}
                onChange={(e) => setFormData({ ...formData, asset_tag: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Make</Label>
              <Select
                value={formData.make}
                onValueChange={(value) => setFormData({ ...formData, make: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent>
                  {makes.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-serial">Serial Number</Label>
              <Input
                id="edit-serial"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cost">Cost</Label>
              <Input
                id="edit-cost"
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateAsset.isPending}>
              {updateAsset.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
