import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { ShieldCheck, Clock, XCircle, Package, CheckCircle2, Send, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { StatCard } from "@/components/helpdesk/assets/StatCard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

type StatusFilter = "all" | "confirmed" | "denied" | "pending" | "overdue";

export default function AssetVerification() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["verification-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_assets")
        .select("id, asset_id, asset_tag, name, status, assigned_to, confirmation_status, last_confirmed_at, checked_out_to, category:itam_categories(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: usersMap = {} } = useQuery({
    queryKey: ["users-lookup-verification"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email").eq("status", "active");
      const map: Record<string, string> = {};
      data?.forEach(u => { map[u.id] = u.name || u.email; });
      return map;
    },
    staleTime: 5 * 60_000,
  });

  const now = new Date();

  const getVerificationStatus = (asset: any): "confirmed" | "denied" | "overdue" | "pending" => {
    if (asset.confirmation_status === "denied") return "denied";
    if (asset.confirmation_status === "confirmed") {
      if (!asset.last_confirmed_at || differenceInDays(now, new Date(asset.last_confirmed_at)) > 60) return "overdue";
      return "confirmed";
    }
    if (!asset.last_confirmed_at || differenceInDays(now, new Date(asset.last_confirmed_at)) > 60) return "overdue";
    return "pending";
  };

  const enriched = useMemo(() => assets.map(a => ({
    ...a,
    verificationStatus: getVerificationStatus(a),
    assignedName: a.assigned_to ? (usersMap as any)[a.assigned_to] || "Unknown" : null,
  })), [assets, usersMap]);

  const stats = useMemo(() => {
    const s = { total: enriched.length, confirmed: 0, denied: 0, overdue: 0, pending: 0 };
    enriched.forEach(a => { s[a.verificationStatus]++; });
    return s;
  }, [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter !== "all") list = list.filter(a => a.verificationStatus === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        (a.name || "").toLowerCase().includes(q) ||
        (a.asset_tag || "").toLowerCase().includes(q) ||
        (a.assignedName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, filter, search]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["verification-assets"] });
    queryClient.invalidateQueries({ queryKey: ["itam-assets"] });
    queryClient.invalidateQueries({ queryKey: ["itam-assets-dashboard-full"] });
  };

  const handleBulkVerifyStock = async () => {
    const available = filtered.filter(a => selected.includes(a.id) && a.status === "available" && !a.assigned_to);
    if (!available.length) { toast.error("No available (unassigned) assets selected"); return; }
    setBulkLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const asset of available) {
        await supabase.from("itam_assets").update({
          confirmation_status: "confirmed",
          last_confirmed_at: new Date().toISOString(),
        } as any).eq("id", asset.id);
        await supabase.from("itam_asset_history").insert({
          asset_id: asset.id,
          action: "stock_verified",
          details: { verified_by: user?.id, method: "bulk_admin" },
          performed_by: user?.id,
        });
      }
      toast.success(`${available.length} asset(s) verified as in stock`);
      setSelected([]);
      invalidateAll();
    } catch (err) {
      console.error(err);
      toast.error("Bulk verification failed");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSendConfirmation = async () => {
    const assigned = filtered.filter(a => selected.includes(a.id) && a.assigned_to);
    if (!assigned.length) { toast.error("No assigned assets selected"); return; }
    setBulkLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      for (const asset of assigned) {
        const token = crypto.randomUUID();
        await supabase.from("itam_asset_confirmations").insert({
          asset_id: asset.id,
          user_id: asset.assigned_to,
          token,
          status: "pending",
          sent_by: user?.id,
        } as any);
        // Look up recipient email
        const { data: recipientUser } = await supabase.from("users").select("email, name").eq("id", asset.assigned_to).maybeSingle();
        if (recipientUser?.email) {
          await supabase.functions.invoke("send-asset-email", {
            body: {
              templateId: "asset_confirmation",
              recipientEmail: recipientUser.email,
              assetId: asset.id,
              variables: {
                user_name: recipientUser.name || recipientUser.email,
                token,
                asset_count: "1",
              },
            },
          });
        }
      }
      toast.success(`Confirmation sent for ${assigned.length} asset(s)`);
      setSelected([]);
      invalidateAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send confirmations");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleVerifySingle = async (assetId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("itam_assets").update({
        confirmation_status: "confirmed",
        last_confirmed_at: new Date().toISOString(),
      } as any).eq("id", assetId);
      await supabase.from("itam_asset_history").insert({
        asset_id: assetId,
        action: "stock_verified",
        details: { verified_by: user?.id, method: "admin_manual" },
        performed_by: user?.id,
      });
      toast.success("Asset verified");
      invalidateAll();
    } catch { toast.error("Failed to verify"); }
  };

  const handleSendSingle = async (asset: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const token = crypto.randomUUID();
      await supabase.from("itam_asset_confirmations").insert({
        asset_id: asset.id,
        user_id: asset.assigned_to,
        token,
        status: "pending",
        sent_by: user?.id,
      } as any);
      // Look up recipient email
      const { data: recipientUser } = await supabase.from("users").select("email, name").eq("id", asset.assigned_to).maybeSingle();
      if (recipientUser?.email) {
        await supabase.functions.invoke("send-asset-email", {
          body: {
            templateId: "asset_confirmation",
            recipientEmail: recipientUser.email,
            assetId: asset.id,
            variables: {
              user_name: recipientUser.name || recipientUser.email,
              token,
              asset_count: "1",
            },
          },
        });
      }
      toast.success("Confirmation sent");
      invalidateAll();
    } catch { toast.error("Failed to send"); }
  };

  const toggleAll = () => {
    setSelected(selected.length === filtered.length ? [] : filtered.map(a => a.id));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      confirmed: { variant: "default", label: "Confirmed" },
      denied: { variant: "destructive", label: "Denied" },
      overdue: { variant: "secondary", label: "Overdue" },
      pending: { variant: "outline", label: "Pending" },
    };
    const c = map[status] || map.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="p-4 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Asset Verification
        </h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={Package} value={stats.total} label="Total Assets" colorClass="bg-primary/10 text-primary" onClick={() => setFilter("all")} active={filter === "all"} />
        <StatCard icon={CheckCircle2} value={stats.confirmed} label="Confirmed" colorClass="bg-emerald-500/10 text-emerald-600" onClick={() => setFilter("confirmed")} active={filter === "confirmed"} />
        <StatCard icon={XCircle} value={stats.denied} label="Denied" colorClass="bg-destructive/10 text-destructive" onClick={() => setFilter("denied")} active={filter === "denied"} />
        <StatCard icon={Clock} value={stats.overdue} label="Overdue" colorClass="bg-amber-500/10 text-amber-600" onClick={() => setFilter("overdue")} active={filter === "overdue"} />
        <StatCard icon={ShieldCheck} value={stats.pending} label="Pending" colorClass="bg-muted text-muted-foreground" onClick={() => setFilter("pending")} active={filter === "pending"} />
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          <ToggleGroup type="single" value={filter} onValueChange={v => { if (v) setFilter(v as StatusFilter); }} variant="outline" size="sm">
            <ToggleGroupItem value="all" className="text-xs h-8 px-3">All</ToggleGroupItem>
            <ToggleGroupItem value="confirmed" className="text-xs h-8 px-3">Confirmed</ToggleGroupItem>
            <ToggleGroupItem value="denied" className="text-xs h-8 px-3">Denied</ToggleGroupItem>
            <ToggleGroupItem value="overdue" className="text-xs h-8 px-3">Overdue</ToggleGroupItem>
            <ToggleGroupItem value="pending" className="text-xs h-8 px-3">Pending</ToggleGroupItem>
          </ToggleGroup>
          {selected.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={handleBulkVerifyStock} disabled={bulkLoading}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                Bulk Verify Stock ({selected.filter(id => { const a = enriched.find(x => x.id === id); return a?.status === "available" && !a?.assigned_to; }).length})
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkSendConfirmation} disabled={bulkLoading}>
                <Send className="h-3.5 w-3.5 mr-1" />
                Bulk Send Confirmation ({selected.filter(id => enriched.find(x => x.id === id)?.assigned_to).length})
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Last Verified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No assets found</TableCell></TableRow>
              ) : (
                filtered.map(asset => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <Checkbox checked={selected.includes(asset.id)} onCheckedChange={c => setSelected(c ? [...selected, asset.id] : selected.filter(id => id !== asset.id))} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{asset.asset_tag || asset.asset_id}</TableCell>
                    <TableCell className="font-medium text-sm">{asset.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{asset.status}</Badge></TableCell>
                    <TableCell className="text-sm">{asset.assignedName || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{statusBadge(asset.verificationStatus)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {asset.last_confirmed_at ? format(new Date(asset.last_confirmed_at), "dd MMM yyyy") : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {asset.status === "available" && !asset.assigned_to ? (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleVerifySingle(asset.id)}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> Verify
                          </Button>
                        ) : asset.assigned_to ? (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleSendSingle(asset)}>
                            <Send className="h-3 w-3 mr-1" /> Send
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/assets/detail/${asset.id}`)}>
                          <Eye className="h-3 w-3 mr-1" /> View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
