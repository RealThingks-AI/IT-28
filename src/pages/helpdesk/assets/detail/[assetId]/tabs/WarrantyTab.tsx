import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface WarrantyTabProps {
  asset: any;
}

export const WarrantyTab = ({ asset }: WarrantyTabProps) => {
  const getExpiryWarning = (endDate: string | null) => {
    if (!endDate) return null;
    const days = differenceInDays(new Date(endDate), new Date());
    if (days < 0) return { message: "Expired", color: "text-destructive" };
    if (days <= 30) return { message: `Expires in ${days} days`, color: "text-warning" };
    return null;
  };

  const warrantyExpiry = asset.warranty_expiry;
  const expiryWarning = getExpiryWarning(warrantyExpiry);

  // Get lease info from custom_fields
  const customFields = asset.custom_fields as Record<string, any> | null;
  const leaseStartDate = customFields?.lease_start_date;
  const leaseExpiry = customFields?.lease_expiry;
  const leaseExpiryWarning = getExpiryWarning(leaseExpiry);

  return (
    <div className="space-y-4">
      {/* Warranty Information */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warranty Information
            </h3>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Warranty Expiry</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {warrantyExpiry ? format(new Date(warrantyExpiry), "dd/MM/yyyy") : "Not set"}
                  </p>
                  {expiryWarning && (
                    <span className={`text-xs flex items-center gap-1 ${expiryWarning.color}`}>
                      <AlertTriangle className="h-3 w-3" />
                      {expiryWarning.message}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Purchase Date</p>
                <p className="text-sm font-medium">
                  {asset.purchase_date ? format(new Date(asset.purchase_date), "dd/MM/yyyy") : "Not set"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Vendor</p>
                <p className="text-sm font-medium">{asset.vendor?.name || customFields?.vendor || "Not set"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Serial Number</p>
                <p className="text-sm font-medium">{asset.serial_number || "Not set"}</p>
              </div>
            </div>

            {!warrantyExpiry && (
              <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/50">
                No warranty information available. Update the asset to add warranty details.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lease Information */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lease Information
            </h3>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Lease Start Date</p>
                <p className="text-sm font-medium">
                  {leaseStartDate ? format(new Date(leaseStartDate), "dd/MM/yyyy") : "Not set"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Lease Expiry Date</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {leaseExpiry ? format(new Date(leaseExpiry), "dd/MM/yyyy") : "Not set"}
                  </p>
                  {leaseExpiryWarning && (
                    <span className={`text-xs flex items-center gap-1 ${leaseExpiryWarning.color}`}>
                      <AlertTriangle className="h-3 w-3" />
                      {leaseExpiryWarning.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!leaseStartDate && !leaseExpiry && (
              <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/50">
                No lease information available. Update the asset to add lease details.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
