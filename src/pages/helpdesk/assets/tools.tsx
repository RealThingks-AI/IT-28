import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssetTopBar } from "@/components/helpdesk/assets/AssetTopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, Download, FileImage, Wrench, TrendingUp, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function ToolsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [photoGalleryOpen, setPhotoGalleryOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');

  // Fetch asset photos from storage bucket
  const {
    data: assetPhotos,
    refetch: refetchPhotos
  } = useQuery({
    queryKey: ['asset-photos-storage'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('asset-photos')
        .list();

      if (error) throw error;

      // Get public URLs for all files
      const photosWithUrls = data.map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from('asset-photos')
          .getPublicUrl(file.name);
        
        return {
          id: file.id,
          name: file.name,
          photo_url: publicUrl,
          created_at: file.created_at,
          metadata: file.metadata
        };
      });

      return photosWithUrls;
    }
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('asset-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
    },
    onSuccess: () => {
      toast.success('Photo uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['asset-photos-storage'] });
      refetchPhotos();
    },
    onError: (error) => {
      toast.error('Failed to upload photo');
      console.error(error);
    }
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photo: any) => {
      const { error: storageError } = await supabase.storage
        .from('asset-photos')
        .remove([photo.name]);

      if (storageError) throw storageError;
    },
    onSuccess: () => {
      toast.success('Photo deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['asset-photos-storage'] });
      refetchPhotos();
    },
    onError: (error) => {
      toast.error('Failed to delete photo');
      console.error(error);
    }
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploadingPhoto(true);
    try {
      await uploadPhotoMutation.mutateAsync(file);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      // Parse CSV data
      const assets = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',');
        const asset: any = {};
        headers.forEach((header, index) => {
          asset[header] = values[index]?.trim();
        });
        assets.push(asset);
      }

      // Insert assets (you would map CSV columns to database columns)
      toast.success(`Parsed ${assets.length} assets from CSV. Ready to import.`);
      console.log('Assets to import:', assets);
    } catch (error) {
      toast.error('Failed to import file');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };
  const handleExport = async () => {
    try {
      const {
        data: assets,
        error
      } = await supabase.from('itam_assets').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      if (exportFormat === 'csv') {
        // Generate CSV
        const headers = Object.keys(assets[0] || {});
        const csvContent = [headers.join(','), ...assets.map(asset => headers.map(header => `"${asset[header] || ''}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], {
          type: 'text/csv'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assets-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        toast.success('Assets exported as CSV');
      } else {
        toast.info('Excel export coming soon');
      }
    } catch (error) {
      toast.error('Failed to export assets');
      console.error(error);
    }
  };
  const generateQRCode = () => {
    toast.info('QR Code generator - Navigate to asset details to generate individual QR codes');
  };
  return <div className="min-h-screen bg-background">
      <AssetTopBar />
      
      <div className="px-4 py-4 space-y-4">
        <div>
          
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive tools for managing your IT assets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Import / Export */}
          <Card className="border hover:border-primary/50 transition-all hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Import / Export</CardTitle>
              <CardDescription className="text-xs">
                Bulk import/export assets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="import-file" className="text-xs">Import Assets</Label>
                <Input id="import-file" type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} disabled={importing} className="cursor-pointer h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="export-format" className="text-xs">Export Format</Label>
                <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                  <SelectTrigger id="export-format" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV File</SelectItem>
                    <SelectItem value="excel">Excel File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleExport} className="w-full h-7 text-xs">
                <Download className="h-3 w-3 mr-1.5" />
                Export Assets
              </Button>
            </CardContent>
          </Card>

          {/* Photo Gallery */}
          <Dialog>
            <DialogTrigger asChild>
              <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                    <FileImage className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">Photo Gallery</CardTitle>
                  <CardDescription className="text-xs">
                    Browse asset photos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-2">
                    {assetPhotos?.length || 0} photos
                  </div>
                  <Button variant="outline" className="w-full h-7 text-xs">
                    Open Gallery
                  </Button>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Asset Photo Gallery</DialogTitle>
                <DialogDescription>
                  Browse, upload, and manage asset photos
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="photo-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm" disabled={uploadingPhoto} asChild>
                      <span>
                        <Plus className="h-4 w-4 mr-2" />
                        {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {assetPhotos?.map((photo: any) => <div key={photo.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={photo.photo_url} 
                          alt={photo.name} 
                          className="w-full h-full object-cover hover:scale-110 transition-transform" 
                          onError={(e) => {
                            console.error('Failed to load image:', photo.photo_url);
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeletePhotoConfirm(photo)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="text-xs mt-2">
                        <p className="font-medium truncate" title={photo.name}>
                          {photo.name}
                        </p>
                        <p className="text-muted-foreground text-[10px]">
                          {photo.created_at ? format(new Date(photo.created_at), 'MMM dd, yyyy') : ''}
                        </p>
                      </div>
                    </div>)}
                  {(!assetPhotos || assetPhotos.length === 0) && <div className="col-span-full text-center py-12 text-muted-foreground">
                      No photos available. Upload your first photo!
                    </div>}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Depreciation */}
          

          {/* Barcode Scanner */}
          

          {/* Asset Reports */}
          

          {/* Depreciation */}
          <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer" onClick={() => navigate('/assets/depreciation')}>
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Depreciation</CardTitle>
              <CardDescription className="text-xs">
                Track asset lifecycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full h-7 text-xs">
                Manage Lifecycle
              </Button>
            </CardContent>
          </Card>

          {/* Repairs & Maintenance */}
          <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer" onClick={() => navigate('/assets/repairs')}>
            <CardHeader className="pb-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1.5">
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Repairs</CardTitle>
              <CardDescription className="text-xs">
                Track asset repairs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full h-7 text-xs">
                View Repairs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deletePhotoConfirm !== null}
        onOpenChange={(open) => !open && setDeletePhotoConfirm(null)}
        onConfirm={() => {
          if (deletePhotoConfirm) {
            deletePhotoMutation.mutate(deletePhotoConfirm);
          }
          setDeletePhotoConfirm(null);
        }}
        title="Delete Photo"
        description="Are you sure you want to delete this photo? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>;
}