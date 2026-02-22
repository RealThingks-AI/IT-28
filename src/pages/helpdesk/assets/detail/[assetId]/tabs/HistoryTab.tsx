import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, History, User, ArrowRight } from "lucide-react";

interface HistoryTabProps {
  assetId: string;
}

interface HistoryDetails {
  assigned_to?: string;
  user_id?: string;
  location?: string;
  location_id?: string;
  department?: string;
  department_id?: string;
  notes?: string;
  expected_return?: string;
  checkout_date?: string;
  checkout_type?: string;
  returned_at?: string;
  reason?: string;
  [key: string]: any;
}

export const HistoryTab = ({ assetId }: HistoryTabProps) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["asset-history", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_asset_history")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!assetId,
  });

  // Fetch users for name lookup
  const { data: usersData = [] } = useQuery({
    queryKey: ["users-for-history"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name, email");
      return data || [];
    },
  });

  // Helper to get user name by ID
  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const user = usersData.find((u) => u.id === userId);
    return user?.name || user?.email || null;
  };

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      created: "bg-green-100 text-green-800",
      updated: "bg-blue-100 text-blue-800",
      checked_out: "bg-purple-100 text-purple-800",
      checked_in: "bg-teal-100 text-teal-800",
      status_changed: "bg-amber-100 text-amber-800",
      deleted: "bg-red-100 text-red-800",
      replicated: "bg-indigo-100 text-indigo-800",
      audit_recorded: "bg-orange-100 text-orange-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      repair: "bg-rose-100 text-rose-800",
    };

    const formattedAction = action.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    return (
      <Badge className={`${actionColors[action] || "bg-gray-100 text-gray-800"} text-xs`}>
        {formattedAction}
      </Badge>
    );
  };

  // Format detail value for display
  const formatDetailValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "";
    if (key.includes("date") || key.includes("return") || key.includes("at")) {
      try {
        return format(new Date(value), "dd/MM/yyyy HH:mm");
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  // Render details from JSON field
  const renderDetails = (details: HistoryDetails | null) => {
    if (!details || typeof details !== 'object') return null;
    
    const excludeKeys = ['checkout_type', 'user_id', 'location_id', 'department_id'];
    const displayEntries = Object.entries(details)
      .filter(([key, value]) => !excludeKeys.includes(key) && value !== null && value !== undefined && value !== '');

    if (displayEntries.length === 0) return null;

    return (
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        {displayEntries.map(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const displayValue = formatDetailValue(key, value);
          return (
            <p key={key}>
              {label}: <span className="text-foreground">{displayValue}</span>
            </p>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading history...
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="p-8 text-center">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">No history available for this asset</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="space-y-2">
          {history.map((item) => {
            const performedByName = getUserName(item.performed_by);
            const details = item.details as HistoryDetails | null;
            
            return (
              <div key={item.id} className="flex gap-3 py-2 border-b last:border-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <History className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(item.action)}
                  </div>
                  
                  {item.old_value && item.new_value && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <span className="truncate max-w-[120px]">{item.old_value}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[120px] text-foreground font-medium">
                        {item.new_value}
                      </span>
                    </div>
                  )}
                  
                  {item.new_value && !item.old_value && item.action !== "audit_recorded" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      → {item.new_value}
                    </p>
                  )}

                  {/* Render full details from JSON */}
                  {renderDetails(details)}
                  
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                    {performedByName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {performedByName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
