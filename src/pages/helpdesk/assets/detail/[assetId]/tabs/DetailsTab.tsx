import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface DetailsTabProps {
  asset: any;
}

export const DetailsTab = ({ asset }: DetailsTabProps) => {
  const navigate = useNavigate();

  const handleVendorClick = () => {
    if (asset.vendor?.id) {
      navigate(`/assets/vendors/detail/${asset.vendor.id}`);
    }
  };

  const handleUserClick = (userId: string | null) => {
    if (userId) {
      // Navigate to user profile or show user details
      navigate(`/settings?tab=users&user=${userId}`);
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          {/* Basic Info Section */}
          <div className="col-span-2 mb-1">
            <h3 className="text-sm font-semibold">Basic Information</h3>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Serial Number</span>
            <span className="font-medium">{asset.serial_number || '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Model</span>
            <span className="font-medium">{asset.model || '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Make</span>
            <span className="font-medium">{asset.make?.name || '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Vendor</span>
            <span 
              className={`font-medium ${asset.vendor?.id ? 'text-primary hover:underline cursor-pointer' : ''}`}
              onClick={handleVendorClick}
            >
              {asset.vendor?.name || '—'}
            </span>
          </div>

          {/* Location Section */}
          <div className="col-span-2 mt-2 mb-1">
            <h3 className="text-sm font-semibold">Location & Assignment</h3>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Category</span>
            <span>{asset.category?.name || '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Department</span>
            <span>{asset.department?.name || '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Location</span>
            <span>{asset.location?.name || '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Site</span>
            <span>{asset.location?.site?.name || asset.custom_fields?.site_name || '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Assigned To</span>
            <span 
              className={`font-medium ${asset.assigned_user?.id ? 'text-primary hover:underline cursor-pointer' : ''}`}
              onClick={() => handleUserClick(asset.assigned_user?.id || asset.assigned_to)}
            >
              {asset.assigned_user?.name || asset.assigned_user?.email || '—'}
            </span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Checked Out To</span>
            <span 
              className={`font-medium ${asset.checked_out_user?.id ? 'text-primary hover:underline cursor-pointer' : ''}`}
              onClick={() => handleUserClick(asset.checked_out_user?.id || asset.checked_out_to)}
            >
              {asset.checked_out_user?.name || asset.checked_out_user?.email || '—'}
            </span>
          </div>

          {/* Financial Section */}
          <div className="col-span-2 mt-2 mb-1">
            <h3 className="text-sm font-semibold">Financial</h3>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Purchase Date</span>
            <span>{asset.purchase_date ? format(new Date(asset.purchase_date), "dd/MM/yyyy") : '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Purchase Price</span>
            <span className="font-medium">
              {(() => {
                const currency = asset.custom_fields?.currency || 'INR';
                const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
                return `${symbols[currency] || '₹'}${asset.purchase_price?.toLocaleString() || '0'}`;
              })()}
            </span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Current Value</span>
            <span className="font-medium">
              {(() => {
                const currency = asset.custom_fields?.currency || 'INR';
                const symbols: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
                const currentVal = asset.current_value ?? asset.purchase_price;
                return `${symbols[currency] || '₹'}${currentVal?.toLocaleString() || '0'}`;
              })()}
            </span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Warranty Expiry</span>
            <span>{asset.warranty_expiry ? format(new Date(asset.warranty_expiry), "dd/MM/yyyy") : '—'}</span>
          </div>

          {/* Description - from notes field or description field */}
          {(asset.notes || asset.description) && (
            <>
              <div className="col-span-2 mt-2 mb-1">
                <h3 className="text-sm font-semibold">Description</h3>
              </div>
              <div className="col-span-2 text-sm py-0.5">
                <p className="text-muted-foreground whitespace-pre-wrap">{asset.notes || asset.description}</p>
              </div>
            </>
          )}

          {/* Creation Section */}
          <div className="col-span-2 mt-2 mb-1">
            <h3 className="text-sm font-semibold">Metadata</h3>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Date Created</span>
            <span>{asset.created_at ? format(new Date(asset.created_at), "dd/MM/yyyy HH:mm") : '—'}</span>
          </div>
          <div className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">Last Updated</span>
            <span>{asset.updated_at ? format(new Date(asset.updated_at), "dd/MM/yyyy HH:mm") : '—'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
