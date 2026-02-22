import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, Plus, Users, Building2, Mail, Phone, Globe, Wrench, Shield, Upload, 
  TrendingUp, ClipboardCheck, CheckCircle, ExternalLink, MapPin, FolderTree, 
  Briefcase, Package, Pencil, Trash2, Settings, FileBarChart
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { TagFormatTab } from "@/components/helpdesk/assets/TagFormatTab";
import { EmailsTab } from "@/components/helpdesk/assets/setup/EmailsTab";
import { PhotoGalleryDialog } from "@/components/helpdesk/assets/PhotoGalleryDialog";
import { DocumentsGalleryDialog } from "@/components/helpdesk/assets/DocumentsGalleryDialog";
import { EmployeeAssetsDialog } from "@/components/helpdesk/assets/EmployeeAssetsDialog";
import { useOrganisationUsers, OrganisationUser } from "@/hooks/useUsers";
import AssetReports from "@/pages/helpdesk/assets/reports";

// Tab configuration for Setup sub-navigation
const SETUP_TABS = [
  { id: "sites", label: "Sites", icon: MapPin },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "departments", label: "Departments", icon: Briefcase },
  { id: "makes", label: "Makes", icon: Package },
  { id: "tagformat", label: "Tag Format", icon: Settings },
  { id: "emails", label: "Emails", icon: Mail },
] as const;

type SetupTabId = typeof SETUP_TABS[number]["id"];

// Reusable stat card component for consistency
const StatCard = ({ icon: Icon, value, label, colorClass }: { 
  icon: React.ElementType; 
  value: number | string; 
  label: string; 
  colorClass: string;
}) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

export default function AdvancedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("employees");
  const [setupSubTab, setSetupSubTab] = useState<SetupTabId>("sites");
  
  // Isolated search/filter state per tab
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [maintenanceSearch, setMaintenanceSearch] = useState("");
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState("all");
  const [warrantySearch, setWarrantySearch] = useState("");
  const [warrantyStatusFilter, setWarrantyStatusFilter] = useState("all");
  
  // Employee assets dialog
  const [selectedEmployee, setSelectedEmployee] = useState<OrganisationUser | null>(null);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  
  // Setup config for sites, locations, etc.
  const { sites, locations, categories, departments, makes } = useAssetSetupConfig();
  
  // Dialog states for setup items
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>("");
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string; name: string } | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["employees", "vendors", "maintenances", "warranties", "tools", "setup", "reports"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch users/employees using the simplified hook
  const { data: employees = [], isLoading: loadingEmployees } = useOrganisationUsers();

  // Fetch asset counts for employees - query from itam_assets directly for accuracy
  const { data: assetCounts = {} } = useQuery({
    queryKey: ["employee-asset-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("assigned_to")
        .eq("is_active", true)
        .not("assigned_to", "is", null);
      
      const counts: Record<string, number> = {};
      data?.forEach((a) => {
        if (a.assigned_to) {
          counts[a.assigned_to] = (counts[a.assigned_to] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Fetch vendors
  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ["itam-vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itam_vendors")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch maintenance records
  const { data: maintenances = [], isLoading: loadingMaintenances } = useQuery({
    queryKey: ["itam-all-maintenances"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_repairs")
        .select("*, asset:itam_assets(id, name, asset_tag, asset_id)")
        .order("created_at", { ascending: false });

      return data || [];
    },
  });

  // Fetch assets with warranty info
  const { data: assetsWithWarranty = [], isLoading: loadingWarranties } = useQuery({
    queryKey: ["itam-assets-warranties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("*, category:itam_categories(name), make:itam_makes(name)")
        .eq("is_active", true)
        .not("warranty_expiry", "is", null)
        .order("warranty_expiry", { ascending: true });
      return data || [];
    },
  });

  // Warranty status helper
  const getWarrantyStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const daysUntil = differenceInDays(expiry, new Date());
    
    if (isPast(expiry)) {
      return { status: "expired", label: "Expired", variant: "destructive" as const, days: Math.abs(daysUntil) };
    } else if (daysUntil <= 30) {
      return { status: "expiring", label: "Expiring Soon", variant: "outline" as const, days: daysUntil };
    } else {
      return { status: "active", label: "Active", variant: "secondary" as const, days: daysUntil };
    }
  };

  // Filter data based on search (isolated per tab)
  const filteredEmployees = employees.filter((emp) =>
    employeeSearch 
      ? emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.email?.toLowerCase().includes(employeeSearch.toLowerCase())
      : true
  );

  const filteredVendors = vendors.filter((vendor) =>
    vendorSearch
      ? vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        vendor.contact_email?.toLowerCase().includes(vendorSearch.toLowerCase())
      : true
  );

  const filteredMaintenances = maintenances.filter(m => {
    // Apply status filter
    if (maintenanceStatusFilter !== "all" && m.status !== maintenanceStatusFilter) {
      return false;
    }
    // Apply search filter
    if (!maintenanceSearch) return true;
    const searchLower = maintenanceSearch.toLowerCase();
    return (
      m.asset?.name?.toLowerCase().includes(searchLower) ||
      m.asset?.asset_tag?.toLowerCase().includes(searchLower) ||
      m.issue_description?.toLowerCase().includes(searchLower) ||
      m.repair_number?.toLowerCase().includes(searchLower)
    );
  });

  const filteredWarranties = assetsWithWarranty.filter(asset => {
    // Apply status filter
    if (warrantyStatusFilter !== "all") {
      const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
      if (warrantyInfo.status !== warrantyStatusFilter) return false;
    }
    // Apply search filter
    if (warrantySearch) {
      const searchLower = warrantySearch.toLowerCase();
      const matchesSearch = 
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.asset_tag?.toLowerCase().includes(searchLower) ||
        asset.serial_number?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const getMaintenanceStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Setup CRUD operations
  const openAddDialog = (type: string) => {
    setDialogType(type);
    setDialogMode("add");
    setInputValue("");
    setSelectedSiteId("");
    setDialogOpen(true);
  };

  const openEditDialog = (type: string, item: any) => {
    setDialogType(type);
    setDialogMode("edit");
    setSelectedItem(item);
    setInputValue(item.name);
    setSelectedSiteId(item.site_id || "");
    setDialogOpen(true);
  };

  const openDeleteDialog = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const getTableName = (type: string) => {
    const tables: Record<string, string> = {
      site: "itam_sites",
      location: "itam_locations",
      category: "itam_categories",
      department: "itam_departments",
      make: "itam_makes",
    };
    return tables[type];
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const tableName = getTableName(dialogType);
      
      if (dialogMode === "add") {
        const insertData: Record<string, unknown> = {
          name: inputValue.trim(),
        };
        
        if (dialogType === "location" && selectedSiteId) {
          insertData.site_id = selectedSiteId;
        }
        
        const { error } = await supabase.from(tableName as any).insert(insertData);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = { name: inputValue.trim() };
        
        if (dialogType === "location") {
          updateData.site_id = selectedSiteId || null;
        }
        
        const { error } = await supabase
          .from(tableName as any)
          .update(updateData)
          .eq("id", selectedItem.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(dialogMode === "add" ? "Added successfully" : "Updated successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-sites"] });
      queryClient.invalidateQueries({ queryKey: ["itam-locations"] });
      queryClient.invalidateQueries({ queryKey: ["itam-categories"] });
      queryClient.invalidateQueries({ queryKey: ["itam-departments"] });
      queryClient.invalidateQueries({ queryKey: ["itam-makes"] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error("Failed: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const tableName = getTableName(type);
      const { error } = await supabase
        .from(tableName as any)
        .update({ is_active: false, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-sites"] });
      queryClient.invalidateQueries({ queryKey: ["itam-locations"] });
      queryClient.invalidateQueries({ queryKey: ["itam-categories"] });
      queryClient.invalidateQueries({ queryKey: ["itam-departments"] });
      queryClient.invalidateQueries({ queryKey: ["itam-makes"] });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to deactivate: " + error.message);
      setDeleteDialogOpen(false);
    },
  });

  // Stats calculations
  const maintenancePending = maintenances.filter(m => m.status === "pending").length;
  const maintenanceInProgress = maintenances.filter(m => m.status === "in_progress").length;
  const maintenanceCompleted = maintenances.filter(m => m.status === "completed").length;
  const warrantyExpiring = assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "expiring").length;
  const warrantyExpired = assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "expired").length;
  const warrantyActive = assetsWithWarranty.filter(a => getWarrantyStatus(a.warranty_expiry).status === "active").length;

  const handleViewEmployeeAssets = (employee: OrganisationUser) => {
    setSelectedEmployee(employee);
    setEmployeeDialogOpen(true);
  };

  // Get setup items by sub-tab
  const getSetupItems = () => {
    switch (setupSubTab) {
      case "sites": return sites;
      case "locations": return locations;
      case "categories": return categories;
      case "departments": return departments;
      case "makes": return makes;
      default: return [];
    }
  };

  // Get the type string for CRUD operations
  const getSetupType = () => {
    const typeMap: Record<SetupTabId, string> = {
      sites: "site",
      locations: "location",
      categories: "category",
      departments: "department",
      makes: "make",
      tagformat: "",
      emails: "",
    };
    return typeMap[setupSubTab];
  };

  // Render standardized setup table
  const renderSetupTable = (items: any[], type: string) => (
    <Table>
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className="font-medium text-xs uppercase text-muted-foreground">Name</TableHead>
          {type === "location" && <TableHead className="font-medium text-xs uppercase text-muted-foreground">Site</TableHead>}
          <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
          <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={type === "location" ? 4 : 3} className="text-center py-8 text-muted-foreground">
              No {type}s found. Click "Add {type}" to create one.
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              {type === "location" && (
                <TableCell>
                  {item.site_id ? (
                    sites.find(s => s.id === item.site_id)?.name || "-"
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              )}
              <TableCell><Badge variant="secondary">Active</Badge></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(type, item)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive" 
                  onClick={() => openDeleteDialog(type, item.id, item.name)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  // Render the active setup content based on setupSubTab
  const renderSetupContent = () => {
    const type = getSetupType();
    const items = getSetupItems();
    const tabConfig = SETUP_TABS.find(t => t.id === setupSubTab);
    const Icon = tabConfig?.icon || Settings;

    if (setupSubTab === "tagformat") {
      return <TagFormatTab />;
    }

    if (setupSubTab === "emails") {
      return <EmailsTab />;
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{tabConfig?.label}</CardTitle>
              <CardDescription className="text-xs">
                Manage {tabConfig?.label.toLowerCase()} for your organization
              </CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => openAddDialog(type)}>
            <Plus className="h-3 w-3 mr-2" />
            Add {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {renderSetupTable(items, type)}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Primary Tabs with Dark Styling */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-11 bg-slate-700 dark:bg-slate-800 rounded-lg p-1 w-full justify-start flex-wrap gap-1">
            <TabsTrigger 
              value="employees" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-200 gap-2"
            >
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger 
              value="vendors" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-200 gap-2"
            >
              <Building2 className="h-4 w-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger 
              value="maintenances" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-200 gap-2"
            >
              <Wrench className="h-4 w-4" />
              Maintenances
            </TabsTrigger>
            <TabsTrigger 
              value="warranties" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-200 gap-2"
            >
              <Shield className="h-4 w-4" />
              Warranties
            </TabsTrigger>
            <TabsTrigger 
              value="tools" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-200 gap-2"
            >
              <Upload className="h-4 w-4" />
              Tools
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-200 gap-2"
            >
              <FileBarChart className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger 
              value="setup" 
              className="data-[state=active]:bg-white data-[state=active]:text-slate-900 text-slate-200 gap-2"
            >
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
          </TabsList>

          {/* Secondary Navigation for Setup Tab - NOT nested Tabs */}
          {activeTab === "setup" && (
            <div className="flex flex-wrap gap-1 mt-4 pb-3 border-b">
              {SETUP_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={setupSubTab === tab.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setSetupSubTab(tab.id)}
                    className={`gap-1.5 ${setupSubTab === tab.id ? "bg-slate-200 dark:bg-slate-700" : ""}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Employees Tab */}
          <TabsContent value="employees" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                icon={Users} 
                value={employees.length} 
                label="Total Employees" 
                colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              />
              <StatCard 
                icon={CheckCircle} 
                value={employees.filter(e => e.status === "active").length} 
                label="Active" 
                colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              />
              <StatCard 
                icon={Package} 
                value={Object.values(assetCounts).reduce((a, b) => a + b, 0)} 
                label="Assets Assigned" 
                colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
              />
            </div>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate("/settings?section=users")}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Name</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Email</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Role</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Assets</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingEmployees ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="text-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="text-sm text-muted-foreground">Loading employees...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Users className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No employees found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((employee) => {
                          const assetCount = assetCounts[employee.id] || 0;
                          const initials = employee.name
                            ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : employee.email[0].toUpperCase();
                          
                          return (
                            <TableRow 
                              key={employee.id} 
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => handleViewEmployeeAssets(employee)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  {employee.name || "—"}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {employee.email ? (
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    {employee.email}
                                  </div>
                                ) : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {employee.role || "user"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={employee.status === "active" ? "secondary" : "destructive"} className="text-xs">
                                  {employee.status === "active" ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{assetCount}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewEmployeeAssets(employee);
                                  }}
                                >
                                  View Assets
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-base">Vendors</CardTitle>
                  <CardDescription className="text-xs">{filteredVendors.length} vendor records</CardDescription>
                </div>
                <Button size="sm" onClick={() => navigate("/assets/vendors/add-vendor")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Vendor Name</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Contact Person</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Email</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Phone</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Website</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingVendors ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <div className="text-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="text-sm text-muted-foreground">Loading vendors...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredVendors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Building2 className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No vendors found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVendors.map((vendor) => (
                          <TableRow
                            key={vendor.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/assets/vendors/detail/${vendor.id}`)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {vendor.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{vendor.contact_name || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {vendor.contact_email ? (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  {vendor.contact_email}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {vendor.contact_phone ? (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  {vendor.contact_phone}
                                </div>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {vendor.website ? (
                                <a
                                  href={vendor.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Globe className="h-3.5 w-3.5" />
                                  Visit
                                </a>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenances Tab */}
          <TabsContent value="maintenances" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                icon={Wrench} 
                value={maintenancePending} 
                label="Pending" 
                colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              />
              <StatCard 
                icon={Wrench} 
                value={maintenanceInProgress} 
                label="In Progress" 
                colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              />
              <StatCard 
                icon={CheckCircle} 
                value={maintenanceCompleted} 
                label="Completed" 
                colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-base">All Maintenance Records</CardTitle>
                  <CardDescription className="text-xs">{filteredMaintenances.length} records</CardDescription>
                </div>
                <Button size="sm" onClick={() => navigate("/assets/repairs/create")}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Maintenance
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search maintenance records..."
                      value={maintenanceSearch}
                      onChange={(e) => setMaintenanceSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={maintenanceStatusFilter} onValueChange={setMaintenanceStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Repair #</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Asset</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Issue</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Created</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[80px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMaintenances ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="text-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="text-sm text-muted-foreground">Loading maintenance records...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredMaintenances.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No maintenance records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMaintenances.map((maintenance) => (
                          <TableRow key={maintenance.id}>
                            <TableCell className="font-medium">{maintenance.repair_number}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{maintenance.asset?.name || '-'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {maintenance.asset?.asset_id || maintenance.asset?.asset_tag}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{maintenance.issue_description || '-'}</TableCell>
                            <TableCell>{getMaintenanceStatusBadge(maintenance.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {maintenance.created_at ? format(new Date(maintenance.created_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/assets/repairs/detail/${maintenance.id}`)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warranties Tab */}
          <TabsContent value="warranties" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                icon={CheckCircle} 
                value={warrantyActive} 
                label="Active" 
                colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              />
              <StatCard 
                icon={Shield} 
                value={warrantyExpiring} 
                label="Expiring Soon" 
                colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              />
              <StatCard 
                icon={Shield} 
                value={warrantyExpired} 
                label="Expired" 
                colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-base">Asset Warranties</CardTitle>
                  <CardDescription className="text-xs">{filteredWarranties.length} warranty records</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search warranties..."
                      value={warrantySearch}
                      onChange={(e) => setWarrantySearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={warrantyStatusFilter} onValueChange={setWarrantyStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expiring">Expiring Soon</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Asset</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Category</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Expiry Date</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground">Days</TableHead>
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[80px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingWarranties ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="text-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="text-sm text-muted-foreground">Loading warranty records...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredWarranties.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No warranty records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWarranties.map((asset) => {
                          const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
                          return (
                            <TableRow key={asset.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <p className="text-sm">{asset.name}</p>
                                  <p className="text-xs text-muted-foreground">{asset.asset_tag}</p>
                                </div>
                              </TableCell>
                              <TableCell>{asset.category?.name || '-'}</TableCell>
                              <TableCell>{format(new Date(asset.warranty_expiry), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                <Badge variant={warrantyInfo.variant}>{warrantyInfo.label}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {warrantyInfo.status === "expired" 
                                  ? `${warrantyInfo.days} days ago` 
                                  : `${warrantyInfo.days} days left`}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => navigate(`/assets/detail/${asset.id}`)}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <Card
                className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate("/assets/import-export")}
              >
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Import / Export</CardTitle>
                  <CardDescription className="text-xs">
                    Bulk import/export assets with proper field mapping
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-8 text-xs">
                    Open Wizard
                  </Button>
                </CardContent>
              </Card>

              <PhotoGalleryDialog />
              <DocumentsGalleryDialog />

              <Card
                className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate("/assets/depreciation")}
              >
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Depreciation</CardTitle>
                  <CardDescription className="text-xs">
                    Track asset lifecycle
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-8 text-xs">
                    Manage Lifecycle
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate("/assets/repairs")}
              >
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Repairs</CardTitle>
                  <CardDescription className="text-xs">
                    Track asset repairs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-8 text-xs">
                    View Repairs
                  </Button>
                </CardContent>
              </Card>

              <Card
                className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer"
                onClick={() => navigate("/assets/audit")}
              >
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Audit</CardTitle>
                  <CardDescription className="text-xs">
                    View asset change history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-8 text-xs">
                    View Audit Trail
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <AssetReports />
          </TabsContent>

          {/* Setup Tab - No nested Tabs component! */}
          <TabsContent value="setup" className="mt-4 space-y-4">
            {renderSetupContent()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? `Add ${dialogType}` : `Edit ${dialogType}`}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "add" 
                ? `Create a new ${dialogType} entry.`
                : `Update the ${dialogType} details.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Enter ${dialogType} name`}
              />
            </div>
            {dialogType === "location" && (
              <div className="space-y-2">
                <Label htmlFor="site">Site (optional)</Label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={!inputValue.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {itemToDelete?.type}</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate "{itemToDelete?.name}"? It will be hidden from all dropdowns and lists but can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (itemToDelete) {
                  deleteMutation.mutate({ type: itemToDelete.type, id: itemToDelete.id });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Assets Dialog */}
      <EmployeeAssetsDialog
        employee={selectedEmployee}
        open={employeeDialogOpen}
        onOpenChange={setEmployeeDialogOpen}
      />
    </div>
  );
}
