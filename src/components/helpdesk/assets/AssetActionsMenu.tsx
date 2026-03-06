import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { 
  MoreHorizontal, 
  LogIn, 
  LogOut, 
  Wrench, 
  Trash2, 
  Copy, 
  Mail,
  MapPin,
  AlertTriangle,
  ShieldCheck
} from "lucide-react";
import { ASSET_STATUS, canCheckIn, canCheckOut } from "@/lib/assetStatusUtils";
import { invalidateAllAssetQueries } from "@/lib/assetQueryUtils";
import { CheckOutDialog } from "./CheckOutDialog";
import { CheckInDialog } from "./CheckInDialog";
import { RepairAssetDialog } from "./RepairAssetDialog";
import { MarkAsLostDialog } from "./MarkAsLostDialog";
import { ReplicateAssetDialog } from "./ReplicateAssetDialog";
import { EmailAssetDialog } from "./EmailAssetDialog";
import { DisposeAssetDialog } from "./DisposeAssetDialog";
import { ReassignAssetDialog } from "./ReassignAssetDialog";

interface AssetActionsMenuProps {
  asset: {
    id: string;
    status: string | null;
    assigned_to?: string | null;
    asset_tag?: string | null;
    name?: string | null;
    asset_id?: string | null;
  };
  onActionComplete?: () => void;
}

export function AssetActionsMenu({ asset, onActionComplete }: AssetActionsMenuProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [replicateDialogOpen, setReplicateDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);

  const invalidateQueries = () => {
    invalidateAllAssetQueries(queryClient);
    onActionComplete?.();
  };

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ status, clearAssignment }: { status: string; clearAssignment?: boolean }) => {
      const updateData: any = { status };
      if (clearAssignment) {
        updateData.assigned_to = null;
        updateData.checked_out_at = null;
        updateData.checked_out_to = null;
        updateData.expected_return_date = null;
        updateData.check_out_notes = null;
      }
      
      const { error } = await supabase
        .from("itam_assets")
        .update(updateData)
        .eq("id", asset.id);
      if (error) throw error;

      // If checking in, update assignment record
      if (status === ASSET_STATUS.AVAILABLE && clearAssignment) {
        await supabase
          .from("itam_asset_assignments")
          .update({ returned_at: new Date().toISOString() })
          .eq("asset_id", asset.id)
          .is("returned_at", null);
      }

      // Log to history
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("itam_asset_history").insert({
        asset_id: asset.id,
        action: `status_changed_to_${status}`,
        details: { previous_status: asset.status, new_status: status },
        performed_by: user?.id,
      });
    },
    onSuccess: (_, { status }) => {
      const statusLabels: Record<string, string> = {
        [ASSET_STATUS.AVAILABLE]: "checked in",
        [ASSET_STATUS.MAINTENANCE]: "marked for maintenance",
        [ASSET_STATUS.LOST]: "marked as lost",
        [ASSET_STATUS.DISPOSED]: "disposed",
      };
      toast.success(`Asset ${statusLabels[status] || "updated"} successfully`);
      invalidateQueries();
    },
    onError: (error) => {
      toast.error("Failed to update asset status");
      console.error(error);
    },
  });

  // Delete (soft delete) mutation with undo and history logging
  const deleteAsset = useMutation({
    mutationFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .eq("id", asset.id);
      if (error) throw error;

      // Log deletion to history
      await supabase.from("itam_asset_history").insert({
        asset_id: asset.id,
        action: "deleted",
        details: { asset_tag: asset.asset_tag, asset_name: asset.name },
        performed_by: currentUser?.id,
      });
    },
    onSuccess: () => {
      toast.success(`Asset "${asset.asset_tag || asset.name || 'Asset'}" deleted`, {
        action: {
          label: "Undo",
          onClick: async () => {
            const { error } = await supabase
              .from("itam_assets")
              .update({ is_active: true })
              .eq("id", asset.id);
            if (!error) {
              // Log restoration to history
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              await supabase.from("itam_asset_history").insert({
                asset_id: asset.id,
                action: "restored",
                details: { asset_tag: asset.asset_tag, asset_name: asset.name },
                performed_by: currentUser?.id,
              });
              toast.success("Delete undone");
              invalidateQueries();
            }
          },
        },
        duration: 5000,
      });
      invalidateQueries();
    },
    onError: (error) => {
      toast.error("Failed to delete asset");
      console.error(error);
    },
  });


  const handleCheckIn = () => {
    setCheckInDialogOpen(true);
  };

  const handleMaintenance = () => {
    setRepairDialogOpen(true);
  };

  const handleLost = () => {
    setLostDialogOpen(true);
  };

  const handleDispose = () => {
    setDisposeDialogOpen(true);
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleReplicate = () => {
    setReplicateDialogOpen(true);
  };

  const isLoading = updateStatus.isPending || deleteAsset.isPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open actions menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canCheckIn(asset.status) && (
            <DropdownMenuItem onClick={handleCheckIn}>
              <LogIn className="h-4 w-4 mr-2" />
              Check In
            </DropdownMenuItem>
          )}
          {canCheckOut(asset.status) && (
            <DropdownMenuItem onClick={() => setCheckOutDialogOpen(true)}>
              <LogOut className="h-4 w-4 mr-2" />
              Check Out
            </DropdownMenuItem>
          )}
          {asset.status === ASSET_STATUS.IN_USE && (
            <DropdownMenuItem onClick={() => setReassignDialogOpen(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Reassign
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleMaintenance}>
            <Wrench className="h-4 w-4 mr-2" />
            Repair
          </DropdownMenuItem>
          {(asset.status === ASSET_STATUS.AVAILABLE || asset.status === ASSET_STATUS.IN_USE) && (
            <DropdownMenuItem onClick={handleLost}>
              <MapPin className="h-4 w-4 mr-2" />
              Mark as Lost
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDispose}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Dispose
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Email to User
          </DropdownMenuItem>
          {asset.assigned_to && (
            <DropdownMenuItem onClick={async () => {
              try {
                // Fetch assigned user email
                const { data: userData } = await supabase
                  .from("users")
                  .select("id, email, name, auth_user_id")
                  .eq("id", asset.assigned_to!)
                  .single();
                if (!userData?.email) { toast.error("No email found for assigned user"); return; }

                // Create confirmation record
                const token = crypto.randomUUID();
                const { data: confirmation, error: confError } = await supabase
                  .from("itam_asset_confirmations")
                  .insert({
                    user_id: userData.id,
                    status: "pending",
                    token,
                  })
                  .select("id")
                  .single();
                if (confError) throw confError;

                // Create confirmation item
                await supabase.from("itam_asset_confirmation_items").insert({
                  confirmation_id: confirmation.id,
                  asset_id: asset.id,
                  status: "pending",
                });

                // Send email
                await supabase.functions.invoke("send-asset-email", {
                  body: {
                    templateId: "asset_confirmation",
                    recipientEmail: userData.email,
                    assetId: asset.id,
                    variables: {
                      user_name: userData.name || userData.email,
                      token,
                      asset_count: "1",
                    },
                  },
                });

                toast.success("Confirmation email sent");
                invalidateQueries();
              } catch (err) {
                console.error(err);
                toast.error("Failed to send confirmation email");
              }
            }}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Send Confirmation
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleReplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Replicate
          </DropdownMenuItem>
          {asset.status === ASSET_STATUS.AVAILABLE && !asset.assigned_to && (
            <DropdownMenuItem onClick={async () => {
              try {
                const { error } = await supabase
                  .from("itam_assets")
                  .update({
                    confirmation_status: "confirmed",
                    last_confirmed_at: new Date().toISOString(),
                  } as any)
                  .eq("id", asset.id);
                if (error) throw error;
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from("itam_asset_history").insert({
                  asset_id: asset.id,
                  action: "stock_verified",
                  details: { verified_by: user?.id, method: "admin_manual" },
                  performed_by: user?.id,
                });
                toast.success("Asset verified as in stock");
                invalidateQueries();
              } catch (err) {
                console.error(err);
                toast.error("Failed to verify stock");
              }
            }}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify Stock
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={() => deleteAsset.mutate()}
        title="Delete Asset"
        description={`Are you sure you want to delete asset "${asset.asset_tag || asset.name || 'this asset'}"? This action can be reversed by an administrator.`}
        confirmText="Delete"
        variant="destructive"
      />

      <CheckOutDialog
        open={checkOutDialogOpen}
        onOpenChange={setCheckOutDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <CheckInDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <RepairAssetDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <MarkAsLostDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <ReplicateAssetDialog
        open={replicateDialogOpen}
        onOpenChange={setReplicateDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <EmailAssetDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        asset={asset}
      />

      <DisposeAssetDialog
        open={disposeDialogOpen}
        onOpenChange={setDisposeDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        onSuccess={invalidateQueries}
      />

      <ReassignAssetDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        assetId={asset.id}
        assetName={asset.asset_tag || asset.name || 'Asset'}
        currentAssignedTo={asset.assigned_to || null}
        onSuccess={invalidateQueries}
      />
    </>
  );
}
