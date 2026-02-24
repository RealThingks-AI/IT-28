import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, Plus, Users, Building2, Mail, Phone, Globe, Wrench, Shield, Upload, 
  TrendingUp, ClipboardCheck, CheckCircle, ExternalLink, MapPin, FolderTree, 
  Briefcase, Package, Pencil, Trash2, Settings, FileBarChart,
  ChevronLeft, ChevronRight, Tag, Loader2, MoreHorizontal, UserX, PackageX,
  Send, Eye, UserMinus, ShoppingCart, ScrollText
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SortableTableHeader, SortConfig } from "@/components/helpdesk/SortableTableHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { Badge } from "@/components/ui/badge";
import { EmailsTab } from "@/components/helpdesk/assets/setup/EmailsTab";
import { PhotoGalleryDialog } from "@/components/helpdesk/assets/PhotoGalleryDialog";
import { DocumentsGalleryDialog } from "@/components/helpdesk/assets/DocumentsGalleryDialog";
import { EmployeeAssetsDialog } from "@/components/helpdesk/assets/EmployeeAssetsDialog";
import { useOrganisationUsers, OrganisationUser } from "@/hooks/useUsers";
import AssetReports from "@/pages/helpdesk/assets/reports";
import PurchaseOrdersList from "@/pages/helpdesk/assets/purchase-orders/index";
import AssetLogsPage from "@/pages/helpdesk/assets/AssetLogsPage";
import AssetAudit from "@/pages/helpdesk/assets/audit/index";

// Wrapper components to embed existing pages without their own headers/padding
const PurchaseOrdersContent = () => <PurchaseOrdersList />;
const AssetLogsContent = () => <AssetLogsPage />;
const AssetAuditContent = () => <AssetAudit />;

// Tab configuration for Setup sub-navigation
const SETUP_TABS = [
  { id: "sites", label: "Sites & Locations", icon: MapPin },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "departments", label: "Departments", icon: Briefcase },
  { id: "makes", label: "Makes", icon: Package },
  { id: "emails", label: "Emails", icon: Mail },
] as const;

type SetupTabId = typeof SETUP_TABS[number]["id"];

const ITEMS_PER_PAGE = 20;

// Reusable stat card component for consistency
const StatCard = ({ icon: Icon, value, label, colorClass, onClick, active }: { 
  icon: React.ElementType; 
  value: number | string; 
  label: string; 
  colorClass: string;
  onClick?: () => void;
  active?: boolean;
}) => (
  <Card className={`${onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""} ${active ? "ring-2 ring-primary" : ""}`} onClick={onClick}>
    <CardContent className="p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

// Status dot indicator
const StatusDot = ({ status, label }: { status: "active" | "inactive" | "pending" | "in_progress" | "completed" | "cancelled" | "expired" | "expiring"; label: string }) => {
  const dotColor = {
    active: "bg-green-500",
    inactive: "bg-red-500",
    pending: "bg-yellow-500",
    in_progress: "bg-blue-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500",
    expired: "bg-red-500",
    expiring: "bg-yellow-500",
  }[status] || "bg-muted-foreground";

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};

// Pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 px-1">
      <p className="text-xs text-muted-foreground">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

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

  // Employees: sorting, role/status filters
  const [employeeSort, setEmployeeSort] = useState<SortConfig>({ column: "name", direction: "asc" });
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState("all");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all");

  // Pagination state
  const [employeePage, setEmployeePage] = useState(1);
  const [vendorPage, setVendorPage] = useState(1);
  
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

  // Tag format state for unified categories view
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagCategory, setTagCategory] = useState<{ id: string; name: string } | null>(null);
  const [tagPrefix, setTagPrefix] = useState("");
  const [tagPadding, setTagPadding] = useState(4);

  // Fetch tag formats for categories
  const { data: tagFormats = [] } = useQuery({
    queryKey: ["category-tag-formats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("category_tag_formats").select("*");
      if (error) throw error;
      return (data || []) as { id: string; category_id: string; prefix: string; current_number: number; zero_padding: number }[];
    },
    enabled: activeTab === "setup" && setupSubTab === "categories",
  });

  // Fetch asset tags for next-number preview
  const { data: allAssetTags = [] } = useQuery({
    queryKey: ["all-asset-tags-for-preview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itam_assets").select("asset_tag").not("asset_tag", "is", null);
      if (error) throw error;
      return (data || []).map((a) => a.asset_tag).filter(Boolean) as string[];
    },
    enabled: activeTab === "setup" && setupSubTab === "categories",
  });

  const getNextNumberForPrefix = (prefix: string): number => {
    let maxNumber = 0;
    for (const tag of allAssetTags) {
      if (tag.startsWith(prefix)) {
        const num = parseInt(tag.substring(prefix.length), 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    }
    return maxNumber + 1;
  };

  const getTagFormatForCategory = (categoryId: string) => tagFormats.find((tf) => tf.category_id === categoryId);

  const openTagDialog = (cat: { id: string; name: string }) => {
    setTagCategory(cat);
    const existing = getTagFormatForCategory(cat.id);
    if (existing) {
      setTagPrefix(existing.prefix);
      setTagPadding(existing.zero_padding);
    } else {
      setTagPrefix(cat.name.substring(0, 3).toUpperCase() + "-");
      setTagPadding(4);
    }
    setTagDialogOpen(true);
  };

  const saveTagMutation = useMutation({
    mutationFn: async () => {
      if (!tagCategory) throw new Error("No category selected");
      const existing = getTagFormatForCategory(tagCategory.id);
      if (existing) {
        const { error } = await supabase.from("category_tag_formats").update({ prefix: tagPrefix.trim(), zero_padding: tagPadding }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("category_tag_formats").insert({ category_id: tagCategory.id, prefix: tagPrefix.trim(), zero_padding: tagPadding, current_number: 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Tag format saved");
      queryClient.invalidateQueries({ queryKey: ["category-tag-formats"] });
      setTagDialogOpen(false);
    },
    onError: (error: Error) => toast.error("Failed: " + error.message),
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["employees", "vendors", "maintenances", "warranties", "tools", "purchase-orders", "setup", "reports", "logs", "audit"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Reset pagination on search change
  useEffect(() => { setEmployeePage(1); }, [employeeSearch]);
  useEffect(() => { setVendorPage(1); }, [vendorSearch]);

  // Fetch users/employees using the simplified hook
  const { data: employees = [], isLoading: loadingEmployees } = useOrganisationUsers();

  // Fetch asset counts for employees
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
    enabled: activeTab === "employees",
    staleTime: 5 * 60 * 1000,
  });

  const getEmployeeAssetCount = (emp: OrganisationUser) => {
    return (assetCounts[emp.id] || 0) + 
      (emp.auth_user_id && emp.auth_user_id !== emp.id 
        ? (assetCounts[emp.auth_user_id] || 0) 
        : 0);
  };

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
    enabled: activeTab === "vendors",
    staleTime: 5 * 60 * 1000,
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
    enabled: activeTab === "maintenances",
    staleTime: 5 * 60 * 1000,
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
    enabled: activeTab === "warranties",
    staleTime: 5 * 60 * 1000,
  });

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

  // Filter data
  const filteredEmployees = employees
    .filter((emp) => {
      if (employeeStatusFilter !== "all" && emp.status !== employeeStatusFilter) return false;
      if (employeeRoleFilter !== "all" && (emp.role || "user") !== employeeRoleFilter) return false;
      if (employeeSearch) {
        return emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          emp.email?.toLowerCase().includes(employeeSearch.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      const { column, direction } = employeeSort;
      if (!direction) return 0;
      const mult = direction === "asc" ? 1 : -1;
      if (column === "assets") {
        return (getEmployeeAssetCount(a) - getEmployeeAssetCount(b)) * mult;
      }
      const valA = (column === "name" ? a.name : column === "email" ? a.email : column === "role" ? (a.role || "user") : a.status) || "";
      const valB = (column === "name" ? b.name : column === "email" ? b.email : column === "role" ? (b.role || "user") : b.status) || "";
      return valA.localeCompare(valB) * mult;
    });

  const handleEmployeeSort = (column: string) => {
    setEmployeeSort(prev => ({
      column,
      direction: prev.column === column ? (prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc") : "asc",
    }));
  };

  const filteredVendors = vendors.filter((vendor) =>
    vendorSearch
      ? vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
        vendor.contact_email?.toLowerCase().includes(vendorSearch.toLowerCase())
      : true
  );

  const filteredMaintenances = maintenances.filter(m => {
    if (maintenanceStatusFilter !== "all" && m.status !== maintenanceStatusFilter) return false;
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
    if (warrantyStatusFilter !== "all") {
      const warrantyInfo = getWarrantyStatus(asset.warranty_expiry);
      if (warrantyInfo.status !== warrantyStatusFilter) return false;
    }
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

  // Paginated slices
  const employeeTotalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const paginatedEmployees = filteredEmployees.slice((employeePage - 1) * ITEMS_PER_PAGE, employeePage * ITEMS_PER_PAGE);

  const vendorTotalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const paginatedVendors = filteredVendors.slice((vendorPage - 1) * ITEMS_PER_PAGE, vendorPage * ITEMS_PER_PAGE);

  const getMaintenanceStatusDot = (status: string) => {
    const map: Record<string, { status: "pending" | "in_progress" | "completed" | "cancelled"; label: string }> = {
      pending: { status: "pending", label: "Pending" },
      in_progress: { status: "in_progress", label: "In Progress" },
      completed: { status: "completed", label: "Completed" },
      cancelled: { status: "cancelled", label: "Cancelled" },
    };
    const info = map[status] || { status: "pending" as const, label: status };
    return <StatusDot status={info.status} label={info.label} />;
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
        // Check for duplicate name (case-insensitive) for categories
        if (dialogType === "category") {
          const { data: existing } = await supabase
            .from("itam_categories")
            .select("id, name")
            .eq("is_active", true)
            .ilike("name", inputValue.trim());
          if (existing && existing.length > 0) {
            throw new Error(`A category named "${existing[0].name}" already exists`);
          }
        }
        const insertData: Record<string, unknown> = { name: inputValue.trim() };
        if (dialogType === "location" && selectedSiteId) insertData.site_id = selectedSiteId;
        const { error } = await supabase.from(tableName as any).insert(insertData);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = { name: inputValue.trim() };
        if (dialogType === "location") updateData.site_id = selectedSiteId || null;
        const { error } = await supabase.from(tableName as any).update(updateData).eq("id", selectedItem.id);
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

  const getSetupItems = () => {
    switch (setupSubTab) {
      case "sites": return sites;
      case "categories": return categories;
      case "departments": return departments;
      case "makes": return makes;
      default: return [];
    }
  };

  const getSetupType = () => {
    const typeMap: Record<SetupTabId, string> = {
      sites: "site", categories: "category",
      departments: "department", makes: "make", emails: "",
    };
    return typeMap[setupSubTab];
  };

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
                  {item.site_id ? (sites.find(s => s.id === item.site_id)?.name || "-") : <span className="text-muted-foreground">-</span>}
                </TableCell>
              )}
              <TableCell><StatusDot status="active" label="Active" /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(type, item)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDeleteDialog(type, item.id, item.name)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderCategoriesTable = () => (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FolderTree className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Categories</CardTitle>
              <CardDescription className="text-xs">
                Manage asset categories and tag format prefixes
              </CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={() => openAddDialog("category")}>
            <Plus className="h-3 w-3 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Category</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Prefix</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Padding</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Next Tag (Preview)</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No categories found. Click "Add Category" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => {
                  const tf = getTagFormatForCategory(cat.id);
                  return (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>
                        {tf ? <Badge variant="secondary">{tf.prefix}</Badge> : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>{tf ? tf.zero_padding : "—"}</TableCell>
                      <TableCell>
                        {tf ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {tf.prefix}{getNextNumberForPrefix(tf.prefix).toString().padStart(tf.zero_padding, "0")}
                          </code>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell><StatusDot status="active" label="Active" /></TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog("category", cat)} title="Edit name">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openTagDialog(cat)} title="Configure tag format">
                          <Tag className="h-3 w-3" />
                          {tf ? "Edit Tag" : "Set Tag"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDeleteDialog("category", cat.id, cat.name)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tag Format Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Tag Format: {tagCategory?.name}</DialogTitle>
            <DialogDescription>Set the prefix and padding for auto-generated asset tags.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Prefix</Label>
              <Input value={tagPrefix} onChange={(e) => setTagPrefix(e.target.value.toUpperCase())} placeholder="e.g., LAP-" />
              <p className="text-xs text-muted-foreground">The prefix before the number (e.g., "LAP-" for Laptops)</p>
            </div>
            <div className="space-y-2">
              <Label>Number Padding</Label>
              <Input type="number" min={1} max={8} value={tagPadding} onChange={(e) => setTagPadding(parseInt(e.target.value) || 4)} />
              <p className="text-xs text-muted-foreground">How many digits to pad (e.g., 4 → 0001, 0002)</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs">Preview</Label>
              <p className="text-lg font-mono mt-1">{tagPrefix ? `${tagPrefix}${"1".padStart(tagPadding, "0")}` : "—"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveTagMutation.mutate()} disabled={saveTagMutation.isPending || !tagPrefix.trim()}>
              {saveTagMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  const renderSitesLocationsTable = () => {
    // Build unified rows: sites first, then locations grouped by parent site
    type UnifiedRow = { id: string; name: string; rowType: "site" | "location"; parentSiteName: string | null; site_id?: string | null };
    const rows: UnifiedRow[] = [];

    // Add all sites
    sites.forEach((s) => rows.push({ id: s.id, name: s.name, rowType: "site", parentSiteName: null }));

    // Add locations grouped by parent site (sites with children first, then orphans)
    const locationsWithSite = locations.filter((l) => l.site_id);
    const locationsWithoutSite = locations.filter((l) => !l.site_id);

    // Sort locations under their parent site order
    sites.forEach((s) => {
      locationsWithSite
        .filter((l) => l.site_id === s.id)
        .forEach((l) => rows.push({ id: l.id, name: l.name, rowType: "location", parentSiteName: s.name, site_id: l.site_id }));
    });

    // Orphan locations at the end
    locationsWithoutSite.forEach((l) => rows.push({ id: l.id, name: l.name, rowType: "location", parentSiteName: null, site_id: null }));

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Sites & Locations</CardTitle>
              <CardDescription className="text-xs">
                Manage sites and locations for your company
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openAddDialog("location")}>
              <Plus className="h-3 w-3 mr-2" />
              Add Location
            </Button>
            <Button size="sm" onClick={() => openAddDialog("site")}>
              <Plus className="h-3 w-3 mr-2" />
              Add Site
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Name</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Type</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Parent Site</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="font-medium text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No sites or locations found. Add a site or location to get started.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${row.rowType}-${row.id}`}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      <Badge variant={row.rowType === "site" ? "default" : "secondary"}>
                        {row.rowType === "site" ? "Site" : "Location"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.rowType === "location" && row.parentSiteName ? (
                        row.parentSiteName
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><StatusDot status="active" label="Active" /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(row.rowType === "site" ? "site" : "location", 
                          row.rowType === "site" 
                            ? sites.find((s) => s.id === row.id) 
                            : locations.find((l) => l.id === row.id)
                        )}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => openDeleteDialog(row.rowType === "site" ? "site" : "location", row.id, row.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderSetupContent = () => {
    const type = getSetupType();
    const items = getSetupItems();
    const tabConfig = SETUP_TABS.find(t => t.id === setupSubTab);
    const Icon = tabConfig?.icon || Settings;

    if (setupSubTab === "sites") return renderSitesLocationsTable();
    if (setupSubTab === "categories") return renderCategoriesTable();
    if (setupSubTab === "emails") return <EmailsTab />;

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
                Manage {tabConfig?.label.toLowerCase()} for your company
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
    <div className="h-full flex flex-col bg-background">
      {/* Single Tabs wrapper for both header and content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        {/* Sticky tabs header */}
        <div className="sticky top-0 z-20 bg-background border-b px-4 pt-3 pb-0">
          <TabsList className="h-9 bg-muted rounded-lg p-1 w-full justify-start gap-1">
            <TabsTrigger value="employees" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="maintenances" className="gap-1.5 text-xs">
              <Wrench className="h-3.5 w-3.5" />
              Maintenances
            </TabsTrigger>
            <TabsTrigger value="warranties" className="gap-1.5 text-xs">
              <Shield className="h-3.5 w-3.5" />
              Warranties
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="gap-1.5 text-xs">
              <ShoppingCart className="h-3.5 w-3.5" />
              Purchase Orders
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs">
              <FileBarChart className="h-3.5 w-3.5" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs">
              <ScrollText className="h-3.5 w-3.5" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Audit
            </TabsTrigger>
            <TabsTrigger value="setup" className="gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" />
              Setup
            </TabsTrigger>
          </TabsList>

          {/* Secondary Navigation for Setup Tab */}
          {activeTab === "setup" && (
            <div className="flex flex-wrap gap-1 pt-3 pb-3">
              {SETUP_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = setupSubTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSetupSubTab(tab.id)}
                    className={`gap-1.5 h-7 text-xs ${isActive ? "" : "text-muted-foreground"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Employees Tab */}
          <TabsContent value="employees" className="mt-0 space-y-4">
            {/* Stat Cards - 5 cards, all clickable */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard icon={Users} value={employees.length} label="Total Employees" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" onClick={() => { setEmployeeStatusFilter("all"); setEmployeeRoleFilter("all"); }} active={employeeStatusFilter === "all" && employeeRoleFilter === "all"} />
              <StatCard icon={CheckCircle} value={employees.filter(e => e.status === "active").length} label="Active" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" onClick={() => { setEmployeeStatusFilter("active"); setEmployeeRoleFilter("all"); }} active={employeeStatusFilter === "active"} />
              <StatCard icon={UserX} value={employees.filter(e => e.status !== "active").length} label="Inactive" colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" onClick={() => { setEmployeeStatusFilter("inactive"); setEmployeeRoleFilter("all"); }} active={employeeStatusFilter === "inactive"} />
              <StatCard icon={Package} value={Object.values(assetCounts).reduce((a, b) => a + b, 0)} label="Assets Assigned" colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" onClick={() => { setEmployeeStatusFilter("all"); setEmployeeRoleFilter("all"); }} />
              <StatCard icon={PackageX} value={employees.filter(e => getEmployeeAssetCount(e) === 0).length} label="No Assets" colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" onClick={() => { setEmployeeStatusFilter("all"); setEmployeeRoleFilter("all"); }} />
            </div>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative max-w-xs flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search employees..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={employeeRoleFilter} onValueChange={setEmployeeRoleFilter}>
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="ml-auto">
                    <Button size="sm" variant="outline" onClick={() => navigate("/settings?section=users")}>
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <SortableTableHeader column="name" label="Name" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <SortableTableHeader column="role" label="Role" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <SortableTableHeader column="status" label="Status" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <SortableTableHeader column="assets" label="Assets" sortConfig={employeeSort} onSort={handleEmployeeSort} />
                        <TableHead className="font-medium text-xs uppercase text-muted-foreground w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingEmployees ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <div className="text-center space-y-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                              <p className="text-sm text-muted-foreground">Loading employees...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : paginatedEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Users className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No employees found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedEmployees.map((employee) => {
                          const assetCount = getEmployeeAssetCount(employee);
                          const initials = employee.name
                            ? employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : employee.email[0].toUpperCase();
                          return (
                            <TableRow key={employee.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleViewEmployeeAssets(employee)}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                                  </Avatar>
                                  {employee.name || "—"}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm capitalize">{employee.role || "user"}</TableCell>
                              <TableCell>
                                <StatusDot status={employee.status === "active" ? "active" : "inactive"} label={employee.status === "active" ? "Active" : "Inactive"} />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{assetCount}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewEmployeeAssets(employee); }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Assets
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/assets/checkout?user=${employee.id}`); }}>
                                      <Package className="h-4 w-4 mr-2" />
                                      Assign Asset
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate("/settings?section=users"); }}>
                                      <Users className="h-4 w-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`mailto:${employee.email}`, '_blank'); }}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Email User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination with info text */}
                {employeeTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-1 px-1">
                    <p className="text-xs text-muted-foreground">
                      Showing {((employeePage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(employeePage * ITEMS_PER_PAGE, filteredEmployees.length)} of {filteredEmployees.length} employees
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={employeePage <= 1} onClick={() => setEmployeePage(p => p - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">Page {employeePage} of {employeeTotalPages}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={employeePage >= employeeTotalPages} onClick={() => setEmployeePage(p => p + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="mt-0 space-y-4">
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
                  <Input placeholder="Search vendors..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="pl-9" />
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
                      ) : paginatedVendors.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <Building2 className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                              <p className="text-sm text-muted-foreground">No vendors found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedVendors.map((vendor) => (
                          <TableRow key={vendor.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/assets/vendors/detail/${vendor.id}`)}>
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
                                <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
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
                <Pagination currentPage={vendorPage} totalPages={vendorTotalPages} onPageChange={setVendorPage} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenances Tab */}
          <TabsContent value="maintenances" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={Wrench} value={maintenancePending} label="Pending" colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
              <StatCard icon={Wrench} value={maintenanceInProgress} label="In Progress" colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
              <StatCard icon={CheckCircle} value={maintenanceCompleted} label="Completed" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
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
                    <Input placeholder="Search maintenance records..." value={maintenanceSearch} onChange={(e) => setMaintenanceSearch(e.target.value)} className="pl-9" />
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
                                <p className="text-xs text-muted-foreground">{maintenance.asset?.asset_id || maintenance.asset?.asset_tag}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{maintenance.issue_description || '-'}</TableCell>
                            <TableCell>{getMaintenanceStatusDot(maintenance.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {maintenance.created_at ? format(new Date(maintenance.created_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/assets/repairs/detail/${maintenance.id}`)}>
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
          <TabsContent value="warranties" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard icon={CheckCircle} value={warrantyActive} label="Active" colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
              <StatCard icon={Shield} value={warrantyExpiring} label="Expiring Soon" colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" />
              <StatCard icon={Shield} value={warrantyExpired} label="Expired" colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
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
                    <Input placeholder="Search warranties..." value={warrantySearch} onChange={(e) => setWarrantySearch(e.target.value)} className="pl-9" />
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
                                <StatusDot status={warrantyInfo.status as any} label={warrantyInfo.label} />
                              </TableCell>
                              <TableCell className="text-sm">
                                {warrantyInfo.status === "expired" ? `${warrantyInfo.days} days ago` : `${warrantyInfo.days} days left`}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/assets/detail/${asset.id}`)}>
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
          <TabsContent value="tools" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer" onClick={() => navigate("/assets/import-export")}>
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Import / Export</CardTitle>
                  <CardDescription className="text-xs">Bulk import/export assets with proper field mapping</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-8 text-xs">Open Wizard</Button>
                </CardContent>
              </Card>

              <PhotoGalleryDialog />
              <DocumentsGalleryDialog />

              <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer" onClick={() => navigate("/assets/depreciation")}>
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Depreciation</CardTitle>
                  <CardDescription className="text-xs">Track asset lifecycle</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-8 text-xs">Manage Lifecycle</Button>
                </CardContent>
              </Card>

              <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer" onClick={() => navigate("/assets/repairs")}>
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Wrench className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Repairs</CardTitle>
                  <CardDescription className="text-xs">Track asset repairs</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-8 text-xs">View Repairs</Button>
                </CardContent>
              </Card>

              <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer" onClick={() => navigate("/assets/logs")}>
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Audit</CardTitle>
                  <CardDescription className="text-xs">View asset change history</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full h-8 text-xs">View Audit Trail</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="purchase-orders" className="mt-0">
            <PurchaseOrdersContent />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-0">
            <AssetReports />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-0">
            <AssetLogsContent />
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="mt-0">
            <AssetAuditContent />
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup" className="mt-0 space-y-4">
            {renderSetupContent()}
          </TabsContent>
        </div>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? `Add ${dialogType}` : `Edit ${dialogType}`}</DialogTitle>
            <DialogDescription>
              {dialogMode === "add" ? `Create a new ${dialogType} entry.` : `Update the ${dialogType} details.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={`Enter ${dialogType} name`} />
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
            <Button onClick={() => saveMutation.mutate()} disabled={!inputValue.trim() || saveMutation.isPending}>
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
            <Button variant="destructive" onClick={() => { if (itemToDelete) deleteMutation.mutate({ type: itemToDelete.type, id: itemToDelete.id }); }} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Assets Dialog */}
      <EmployeeAssetsDialog employee={selectedEmployee} open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen} />
    </div>
  );
}
