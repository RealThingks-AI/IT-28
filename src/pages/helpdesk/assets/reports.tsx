import { AssetTopBar } from "@/components/helpdesk/assets/AssetTopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Package, Calendar, ClipboardCheck, Activity, BarChart3, Key, Wrench, ArrowRightLeft, Receipt, Building2, CalendarClock, TrendingDown } from "lucide-react";
import { useAssetReports } from "@/hooks/useAssetReports";
import { generateCSV, downloadCSV, formatCurrency, formatDate } from "@/lib/reportUtils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const AssetReports = () => {
  const { data: reportData, isLoading } = useAssetReports();

  const generateAssetInventoryReport = () => {
    if (!reportData?.assets.length) {
      toast.error("No assets found to generate report");
      return;
    }
    const headers = ["Name", "Asset Tag", "Status", "Purchase Date", "Purchase Price"];
    const data = reportData.assets.map(asset => ({
      Name: asset.name,
      "Asset Tag": asset.asset_tag || "N/A",
      Status: asset.status || "N/A",
      "Purchase Date": formatDate(asset.purchase_date),
      "Purchase Price": formatCurrency(asset.purchase_price)
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "asset_inventory_report");
    toast.success("Asset Inventory Report downloaded successfully");
  };

  const generateAssignmentHistoryReport = () => {
    if (!reportData?.assignments.length) {
      toast.error("No assignment records found");
      return;
    }
    const headers = ["Asset ID", "Assigned To", "Assigned At", "Returned At", "Notes"];
    const data = reportData.assignments.map(assignment => ({
      "Asset ID": assignment.asset_id,
      "Assigned To": assignment.assigned_to,
      "Assigned At": formatDate(assignment.assigned_at),
      "Returned At": assignment.returned_at ? formatDate(assignment.returned_at) : "Still Assigned",
      Notes: assignment.notes || "N/A"
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "assignment_history_report");
    toast.success("Assignment History Report downloaded successfully");
  };

  const generateAssetStatusReport = () => {
    if (!reportData?.assets.length) {
      toast.error("No assets found");
      return;
    }
    const statusSummary = reportData.assets.reduce((acc, asset) => {
      const status = asset.status || "unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const headers = ["Status", "Count"];
    const data = Object.entries(statusSummary).map(([status, count]) => ({
      Status: status,
      Count: count
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "asset_status_report");
    toast.success("Asset Status Report downloaded successfully");
  };

  const generateLicenseReport = () => {
    if (!reportData?.licenses.length) {
      toast.error("No licenses found");
      return;
    }
    const headers = ["License Name", "License Type", "Expiry Date", "Seats Total", "Seats Allocated"];
    const data = reportData.licenses.map(license => ({
      "License Name": license.name,
      "License Type": license.license_type || "N/A",
      "Expiry Date": formatDate(license.expiry_date),
      "Seats Total": license.seats_total,
      "Seats Allocated": license.seats_allocated
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "license_report");
    toast.success("License Report downloaded successfully");
  };

  const generateRepairsReport = () => {
    if (!reportData?.repairs.length) {
      toast.error("No repair records found");
      return;
    }
    const headers = ["Asset ID", "Issue Description", "Cost", "Status", "Created At", "Completed At", "Notes"];
    const data = reportData.repairs.map(record => ({
      "Asset ID": record.asset_id,
      "Issue Description": record.issue_description,
      Cost: formatCurrency(record.cost),
      Status: record.status || "N/A",
      "Created At": formatDate(record.created_at),
      "Completed At": formatDate(record.completed_at),
      Notes: record.notes || "N/A"
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "repairs_report");
    toast.success("Repairs Report downloaded successfully");
  };

  const generateCategoryReport = () => {
    if (!reportData?.assets.length) {
      toast.error("No assets found");
      return;
    }
    const categorySummary = reportData.assets.reduce((acc, asset) => {
      const category = asset.category_id || "Uncategorized";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const headers = ["Category ID", "Count"];
    const data = Object.entries(categorySummary).map(([category, count]) => ({
      "Category ID": category,
      Count: count
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "asset_category_report");
    toast.success("Asset Category Report downloaded successfully");
  };

  const generateCheckOutReport = () => {
    if (!reportData?.assignments.length) {
      toast.error("No check-out records found");
      return;
    }
    const checkedOut = reportData.assignments.filter(a => !a.returned_at);
    const headers = ["Asset ID", "Assigned To", "Check Out Date", "Expected Return", "Notes"];
    const data = checkedOut.map(assignment => ({
      "Asset ID": assignment.asset_id,
      "Assigned To": assignment.assigned_to,
      "Check Out Date": formatDate(assignment.assigned_at),
      "Expected Return": "N/A",
      Notes: assignment.notes || "N/A"
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "checkout_report");
    toast.success("Check-Out Report downloaded successfully");
  };

  const generateContractReport = () => {
    // Using assets with warranty info as proxy for contracts
    if (!reportData?.assets.length) {
      toast.error("No contract data found");
      return;
    }
    const assetsWithWarranty = reportData.assets.filter(a => a.warranty_expiry);
    const headers = ["Asset Name", "Asset Tag", "Warranty Expiry", "Status"];
    const data = assetsWithWarranty.map(asset => ({
      "Asset Name": asset.name,
      "Asset Tag": asset.asset_tag || "N/A",
      "Warranty Expiry": formatDate(asset.warranty_expiry),
      Status: new Date(asset.warranty_expiry) > new Date() ? "Active" : "Expired"
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "contract_report");
    toast.success("Contract Report downloaded successfully");
  };

  const generateLeasedAssetReport = () => {
    if (!reportData?.assets.length) {
      toast.error("No assets found");
      return;
    }
    // Filter by status or a specific field that indicates leased assets
    const leasedAssets = reportData.assets.filter(a => a.status === 'leased' || a.status === 'Leased');
    if (!leasedAssets.length) {
      // If no leased assets, show all assets for this report
      const headers = ["Asset Name", "Asset Tag", "Status", "Purchase Price"];
      const data = reportData.assets.map(asset => ({
        "Asset Name": asset.name,
        "Asset Tag": asset.asset_tag || "N/A",
        Status: asset.status || "N/A",
        "Purchase Price": formatCurrency(asset.purchase_price)
      }));
      const csv = generateCSV(data, headers);
      downloadCSV(csv, "leased_asset_report");
      toast.success("Leased Asset Report downloaded (showing all assets)");
      return;
    }
    const headers = ["Asset Name", "Asset Tag", "Status", "Purchase Price"];
    const data = leasedAssets.map(asset => ({
      "Asset Name": asset.name,
      "Asset Tag": asset.asset_tag || "N/A",
      Status: asset.status || "N/A",
      "Purchase Price": formatCurrency(asset.purchase_price)
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "leased_asset_report");
    toast.success("Leased Asset Report downloaded successfully");
  };

  const generateMaintenanceReport = () => {
    if (!reportData?.repairs.length) {
      toast.error("No maintenance records found");
      return;
    }
    const headers = ["Asset ID", "Type", "Description", "Cost", "Status", "Date"];
    const data = reportData.repairs.map(record => ({
      "Asset ID": record.asset_id,
      Type: "Repair/Maintenance",
      Description: record.issue_description,
      Cost: formatCurrency(record.cost),
      Status: record.status || "N/A",
      Date: formatDate(record.created_at)
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "maintenance_report");
    toast.success("Maintenance Report downloaded successfully");
  };

  const generateReservationReport = () => {
    toast.info("Reservation report - Query reservations table");
    // Placeholder - would query itam_asset_reservations
  };

  const generateTransactionReport = () => {
    if (!reportData?.assignments.length) {
      toast.error("No transaction records found");
      return;
    }
    const headers = ["Asset ID", "Transaction Type", "Date", "User", "Notes"];
    const data = reportData.assignments.map(assignment => ({
      "Asset ID": assignment.asset_id,
      "Transaction Type": assignment.returned_at ? "Check-In" : "Check-Out",
      Date: formatDate(assignment.returned_at || assignment.assigned_at),
      User: assignment.assigned_to,
      Notes: assignment.notes || "N/A"
    }));
    const csv = generateCSV(data, headers);
    downloadCSV(csv, "transaction_report");
    toast.success("Transaction Report downloaded successfully");
  };

  const reports = [
    {
      title: "Asset Inventory Report",
      description: "Complete list of all assets with details",
      icon: Package,
      action: generateAssetInventoryReport,
      count: reportData?.assets.length || 0,
      category: "Asset Reports"
    },
    {
      title: "Assignment History",
      description: "Historical record of asset assignments",
      icon: FileText,
      action: generateAssignmentHistoryReport,
      count: reportData?.assignments.length || 0,
      category: "Asset Reports"
    },
    {
      title: "Asset Status Report",
      description: "Summary of assets by current status",
      icon: Activity,
      action: generateAssetStatusReport,
      count: reportData?.assets.length || 0,
      category: "Status Reports"
    },
    {
      title: "Category Report",
      description: "Assets categorized by type",
      icon: ClipboardCheck,
      action: generateCategoryReport,
      count: reportData?.assets.length || 0,
      category: "Asset Reports"
    },
    {
      title: "Check-Out Report",
      description: "Currently checked out assets",
      icon: ArrowRightLeft,
      action: generateCheckOutReport,
      count: reportData?.assignments?.filter(a => !a.returned_at).length || 0,
      category: "Check-Out Reports"
    },
    {
      title: "Contract Report",
      description: "Asset warranties and contracts",
      icon: Receipt,
      action: generateContractReport,
      count: reportData?.assets?.filter(a => a.warranty_expiry).length || 0,
      category: "Contract Reports"
    },
    {
      title: "Leased Asset Report",
      description: "Leased vs owned asset breakdown",
      icon: Building2,
      action: generateLeasedAssetReport,
      count: reportData?.assets?.filter(a => a.status === 'leased' || a.status === 'Leased').length || reportData?.assets.length || 0,
      category: "Leased Asset Reports"
    },
    {
      title: "Maintenance Report",
      description: "Scheduled and completed maintenance",
      icon: Wrench,
      action: generateMaintenanceReport,
      count: reportData?.repairs.length || 0,
      category: "Maintenance Reports"
    },
    {
      title: "Reservation Report",
      description: "Asset reservation history",
      icon: CalendarClock,
      action: generateReservationReport,
      count: 0,
      category: "Reservation Reports"
    },
    {
      title: "Transaction Report",
      description: "All asset transactions",
      icon: TrendingDown,
      action: generateTransactionReport,
      count: reportData?.assignments.length || 0,
      category: "Transaction Reports"
    },
    {
      title: "License Report",
      description: "Software licenses overview",
      icon: Key,
      action: generateLicenseReport,
      count: reportData?.licenses.length || 0,
      category: "Other Reports"
    },
    {
      title: "Repairs Report",
      description: "Complete repair records",
      icon: Wrench,
      action: generateRepairsReport,
      count: reportData?.repairs.length || 0,
      category: "Other Reports"
    }
  ];

  const categories = Array.from(new Set(reports.map(r => r.category)));

  return (
    <div className="min-h-screen bg-background">
      <AssetTopBar />

      <div className="px-4 py-3 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          categories.map(category => (
            <div key={category} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {reports
                  .filter(r => r.category === category)
                  .map(report => (
                    <Card key={report.title} className="p-3 hover:shadow-md transition-shadow border hover:border-primary/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <report.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {report.count} records
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm mb-1.5">{report.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2.5 line-clamp-2">{report.description}</p>
                      <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={report.action} disabled={report.count === 0}>
                        <Download className="h-3 w-3 mr-1.5" />
                        Generate Report
                      </Button>
                    </Card>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AssetReports;
