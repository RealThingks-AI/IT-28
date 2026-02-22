import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image, Upload, X, ZoomIn, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";

interface PhotosTabProps {
  assetId: string;
}

interface PhotoMeta {
  url: string;
  name: string;
  uploaded_at: string;
}

export const PhotosTab = ({ assetId }: PhotosTabProps) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch photos from Supabase storage
  const { data: photos = [], isLoading, refetch } = useQuery({
    queryKey: ["asset-photos", assetId],
    queryFn: async () => {
      // List files in the asset's folder
      const { data: files, error } = await supabase.storage
        .from("asset-photos")
        .list(assetId, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        console.error("Error fetching photos:", error);
        return [];
      }

      if (!files || files.length === 0) return [];

      // Get public URLs for each file
      const photoUrls = files
        .filter(file => file.name !== ".emptyFolderPlaceholder")
        .map(file => {
          const { data } = supabase.storage
            .from("asset-photos")
            .getPublicUrl(`${assetId}/${file.name}`);
          
          return {
            url: data.publicUrl,
            name: file.name,
            uploaded_at: file.created_at || "",
          };
        });

      return photoUrls as PhotoMeta[];
    },
    enabled: !!assetId,
  });

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${assetId}/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("asset-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      toast.success("Photo uploaded successfully");
      refetch();
      
      // Reset the file input
      event.target.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (fileName: string) => {
    try {
      const { error } = await supabase.storage
        .from("asset-photos")
        .remove([`${assetId}/${fileName}`]);

      if (error) throw error;

      toast.success("Photo removed");
      refetch();
    } catch (error: any) {
      console.error("Remove error:", error);
      toast.error(error.message || "Failed to remove photo");
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="relative">
            <input
              type="file"
              id="photo-upload"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button variant="outline" size="sm" className="w-full" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </>
              )}
            </Button>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-6">
              <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No photos attached to this asset</p>
              <p className="text-xs text-muted-foreground mt-1">Add photos of the asset condition</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={photo.name} className="relative group aspect-square">
                  <img
                    src={photo.url}
                    alt={`Asset photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPreviewUrl(photo.url)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemove(photo.name)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full-screen preview dialog */}
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl p-0">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Asset photo preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
