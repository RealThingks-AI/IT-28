import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Building2, MapPin, FolderTree, Briefcase, Package, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TagFormatTab } from "@/components/helpdesk/assets/TagFormatTab";

export default function FieldsSetupPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("sites");
  const { sites, locations, categories, departments, makes } = useAssetSetupConfig();

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>("");
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  // Handle query parameter for tab switching
  useEffect(() => {
    const section = searchParams.get("section");
    if (section) {
      const tabMapping: Record<string, string> = {
        sites: "sites",
        locations: "locations",
        categories: "categories",
        departments: "departments",
        makes: "makes",
        tagformat: "tagformat",
      };
      if (tabMapping[section]) {
        setActiveTab(tabMapping[section]);
      }
    }
  }, [searchParams]);

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

      const { data: userData } = await supabase
        .from("users")
        .select("organisation_id")
        .eq("auth_user_id", user.id)
        .single();

      const tableName = getTableName(dialogType);
      
      if (dialogMode === "add") {
        const insertData: Record<string, unknown> = {
          name: inputValue.trim(),
          organisation_id: userData?.organisation_id,
        };
        
        // Add site_id for locations
        if (dialogType === "location" && selectedSiteId) {
          insertData.site_id = selectedSiteId;
        }
        
        const { error } = await supabase.from(tableName as any).insert(insertData);
        if (error) throw error;
      } else {
        const updateData: Record<string, unknown> = { name: inputValue.trim() };
        
        // Update site_id for locations
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
      queryClient.invalidateQueries({ queryKey: [`itam-${dialogType}s`] });
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
      const { error } = await supabase.from(tableName as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["itam-sites"] });
      queryClient.invalidateQueries({ queryKey: ["itam-locations"] });
      queryClient.invalidateQueries({ queryKey: ["itam-categories"] });
      queryClient.invalidateQueries({ queryKey: ["itam-departments"] });
      queryClient.invalidateQueries({ queryKey: ["itam-makes"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const renderTable = (items: any[], type: string, icon: any) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>NAME</TableHead>
          {type === "location" && <TableHead>SITE</TableHead>}
          <TableHead>STATUS</TableHead>
          <TableHead className="text-right">ACTIONS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
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
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ type, id: item.id })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-2xl font-bold">Fields Setup</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="sites">Sites</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="makes">Makes</TabsTrigger>
            <TabsTrigger value="tagformat">Tag Format</TabsTrigger>
          </TabsList>

          <TabsContent value="sites" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Sites</CardTitle>
                  <CardDescription className="text-xs">Manage site locations</CardDescription>
                </div>
                <Button size="sm" onClick={() => openAddDialog("site")}><Plus className="h-3 w-3 mr-2" />Add Site</Button>
              </CardHeader>
              <CardContent>{renderTable(sites, "site", Building2)}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Locations</CardTitle>
                  <CardDescription className="text-xs">Manage locations and link them to sites</CardDescription>
                </div>
                <Button size="sm" onClick={() => openAddDialog("location")}><Plus className="h-3 w-3 mr-2" />Add Location</Button>
              </CardHeader>
              <CardContent>{renderTable(locations, "location", MapPin)}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><FolderTree className="h-4 w-4" />Categories</CardTitle>
                  <CardDescription className="text-xs">Manage asset categories</CardDescription>
                </div>
                <Button size="sm" onClick={() => openAddDialog("category")}><Plus className="h-3 w-3 mr-2" />Add Category</Button>
              </CardHeader>
              <CardContent>{renderTable(categories, "category", FolderTree)}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" />Departments</CardTitle>
                  <CardDescription className="text-xs">Manage departments</CardDescription>
                </div>
                <Button size="sm" onClick={() => openAddDialog("department")}><Plus className="h-3 w-3 mr-2" />Add Department</Button>
              </CardHeader>
              <CardContent>{renderTable(departments, "department", Briefcase)}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="makes" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Makes</CardTitle>
                  <CardDescription className="text-xs">Manage asset makes</CardDescription>
                </div>
                <Button size="sm" onClick={() => openAddDialog("make")}><Plus className="h-3 w-3 mr-2" />Add Make</Button>
              </CardHeader>
              <CardContent>{renderTable(makes, "make", Package)}</CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tagformat" className="mt-4">
            <TagFormatTab />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? "Add" : "Edit"} {dialogType}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={`Enter ${dialogType} name`} />
            </div>
            
            {/* Site selector for locations */}
            {dialogType === "location" && (
              <div className="space-y-2">
                <Label>Site (Optional)</Label>
                <Select 
                  value={selectedSiteId || "__none__"} 
                  onValueChange={(v) => setSelectedSiteId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Site</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link this location to a site. Locations without a site will be available for all sites.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !inputValue.trim()}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {dialogMode === "add" ? "Add" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
