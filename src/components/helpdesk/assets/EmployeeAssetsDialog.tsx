import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Package, ExternalLink, Mail, User } from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  email: string;
  role: string | null;
  status: string | null;
}

interface EmployeeAssetsDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeAssetsDialog({ employee, open, onOpenChange }: EmployeeAssetsDialogProps) {
  const navigate = useNavigate();

  // Fetch assets assigned to this employee
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["employee-assets", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];
      
      const { data } = await supabase
        .from("itam_asset_assignments")
        .select(`
          id,
          assigned_at,
          returned_at,
          asset:itam_assets(id, name, asset_tag, asset_id, status, category:itam_categories(name))
        `)
        .eq("assigned_to", employee.id)
        .is("returned_at", null)
        .order("assigned_at", { ascending: false });
      
      return data || [];
    },
    enabled: !!employee?.id && open,
  });

  // Fetch assignment history
  const { data: history = [] } = useQuery({
    queryKey: ["employee-asset-history", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return [];
      
      const { data } = await supabase
        .from("itam_asset_assignments")
        .select(`
          id,
          assigned_at,
          returned_at,
          asset:itam_assets(id, name, asset_tag, asset_id)
        `)
        .eq("assigned_to", employee.id)
        .not("returned_at", "is", null)
        .order("returned_at", { ascending: false })
        .limit(10);
      
      return data || [];
    },
    enabled: !!employee?.id && open,
  });

  if (!employee) return null;

  const initials = employee.name
    ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : employee.email[0].toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{employee.name || "Unknown User"}</p>
              <p className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {employee.email}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Employee Details */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="capitalize">
              <User className="h-3 w-3 mr-1" />
              {employee.role || "user"}
            </Badge>
            <Badge variant={employee.status === "active" ? "secondary" : "destructive"}>
              {employee.status === "active" ? "Active" : "Inactive"}
            </Badge>
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              {assignments.length} asset{assignments.length !== 1 ? 's' : ''} assigned
            </div>
          </div>

          {/* Currently Assigned Assets */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Currently Assigned Assets</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Asset</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Assigned Date</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No assets currently assigned
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{assignment.asset?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.asset?.asset_id || assignment.asset?.asset_tag}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {assignment.asset?.category?.name || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {assignment.assigned_at 
                            ? format(new Date(assignment.assigned_at), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize text-xs">
                            {assignment.asset?.status || "assigned"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              onOpenChange(false);
                              navigate(`/assets/detail/${assignment.asset?.id}`);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Recent Return History */}
          {history.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Recent Return History</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Asset</TableHead>
                      <TableHead className="text-xs">Assigned</TableHead>
                      <TableHead className="text-xs">Returned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item: any) => (
                      <TableRow key={item.id} className="text-muted-foreground">
                        <TableCell>
                          <p className="text-sm">{item.asset?.name}</p>
                          <p className="text-xs">
                            {item.asset?.asset_id || item.asset?.asset_tag}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.assigned_at 
                            ? format(new Date(item.assigned_at), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.returned_at 
                            ? format(new Date(item.returned_at), "MMM d, yyyy")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
