import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ClipboardList, LogIn, LogOut, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { FormattedDate } from "@/components/FormattedDate";
import { Link } from "react-router-dom";

const PAGE_SIZE = 50;

function getDateFilter(preset: string): string | null {
  if (preset === "all") return null;
  const d = new Date();
  if (preset === "today") d.setHours(0, 0, 0, 0);
  else if (preset === "7d") d.setDate(d.getDate() - 7);
  else if (preset === "30d") d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AssetLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: usersMap } = useQuery({
    queryKey: ["users-map-logs"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email");
      const map: Record<string, string> = {};
      data?.forEach((u) => { map[u.id] = u.name || u.email || u.id; });
      return map;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["asset-logs", search, actionFilter, datePreset, page],
    queryFn: async () => {
      let query = supabase
        .from("itam_asset_history")
        .select("*, itam_assets(id, name, asset_tag)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      const dateFrom = getDateFilter(datePreset);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (search) query = query.or(`action.ilike.%${search}%,old_value.ilike.%${search}%,new_value.ilike.%${search}%`);

      const { data: logs, count, error } = await query;
      if (error) throw error;
      return { logs: logs || [], total: count || 0 };
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Logs", value: total, icon: ClipboardList, color: "text-primary" },
            { label: "Check Outs", value: logs.filter((l: any) => l.action === "checkout").length, icon: LogOut, color: "text-warning" },
            { label: "Check Ins", value: logs.filter((l: any) => l.action === "checkin").length, icon: LogIn, color: "text-success" },
            { label: "Changes", value: logs.filter((l: any) => ["status_change", "updated"].includes(l.action)).length, icon: Activity, color: "text-secondary" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search logs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-8 h-9" />
          </div>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="checkout">Check Out</SelectItem>
              <SelectItem value="checkin">Check In</SelectItem>
              <SelectItem value="status_change">Status Change</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={datePreset} onValueChange={(v) => { setDatePreset(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old / New</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No logs found</TableCell></TableRow>
              ) : logs.map((log: any) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedLog(log)}>
                  <TableCell className="text-xs"><FormattedDate date={log.created_at} /></TableCell>
                  <TableCell>
                    {log.itam_assets ? (
                      <Link to={`/assets/detail/${log.itam_assets.id}`} className="text-primary hover:underline text-xs" onClick={(e) => e.stopPropagation()}>{log.itam_assets.asset_tag}</Link>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{formatAction(log.action)}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.field_name || "-"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{log.old_value || log.new_value ? `${log.old_value || "-"} -> ${log.new_value || "-"}` : "-"}</TableCell>
                  <TableCell className="text-xs">{usersMap?.[log.performed_by] || "System"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <SheetContent>
            <SheetHeader><SheetTitle>Log Details</SheetTitle></SheetHeader>
            {selectedLog && (
              <div className="mt-4 space-y-3 text-sm">
                <div><span className="text-muted-foreground">Date:</span> <FormattedDate date={selectedLog.created_at} /></div>
                <div><span className="text-muted-foreground">Action:</span> <Badge variant="outline">{formatAction(selectedLog.action)}</Badge></div>
                <div><span className="text-muted-foreground">Asset:</span> {selectedLog.itam_assets?.asset_tag || "N/A"}</div>
                <div><span className="text-muted-foreground">By:</span> {usersMap?.[selectedLog.performed_by] || "System"}</div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </ScrollArea>
  );
}
