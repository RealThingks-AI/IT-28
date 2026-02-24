

# Move Remaining Sidebar Items to Advanced Section

## Overview
Remove **Vendors, Licenses, Repairs, Depreciation, Import/Export, and Reports** from the sidebar and ensure they are all accessible as tabs in the Advanced section. After this change, the sidebar will have only **6 items**: Dashboard, All Assets, Add Asset, Check Out, Check In, Advanced.

## Current Sidebar (12 items)
Dashboard, All Assets, Add Asset, Check Out, Check In, **Vendors**, **Licenses**, **Repairs**, **Depreciation**, **Import/Export**, **Reports**, Advanced

## New Sidebar (6 items)
Dashboard, All Assets, Add Asset, Check Out, Check In, Advanced

## Current Advanced Tabs
Employees, Vendors, Maintenances, Warranties, Tools, Purchase Orders, Reports, Logs, Audit, Setup

## New Advanced Tabs (adding 4 new)
Employees, **Licenses**, Vendors, **Repairs**, Maintenances, Warranties, **Depreciation**, Tools, **Import/Export**, Purchase Orders, Reports, Logs, Audit, Setup

## Changes

### 1. `src/layouts/AssetsLayout.tsx`
- Remove sidebar entries for: Vendors, Licenses, Repairs, Depreciation, Import/Export, Reports
- Remove unused icon imports (Building2, Key, Wrench, TrendingDown, FileDown, BarChart3)

### 2. `src/pages/helpdesk/assets/advanced/index.tsx`
- Import existing page components: `LicensesIndex`, `RepairsIndex`, `DepreciationDashboard`, `ImportExportPage`
- Add wrapper components for embedding (similar to existing PurchaseOrdersContent pattern)
- Add 4 new TabsTrigger entries: Licenses, Repairs, Depreciation, Import/Export
- Add 4 corresponding TabsContent entries that render embedded components
- Update the valid tabs list in `useEffect` to include `"licenses"`, `"repairs"`, `"depreciation"`, `"import-export"`
- Add required Lucide icons: `Key`, `TrendingDown`, `FileDown`

### 3. Routes (`src/App.tsx`)
- Keep all existing routes intact so direct URL access still works

### Technical Details

**New imports in advanced/index.tsx:**
```
import LicensesIndex from "@/pages/helpdesk/assets/licenses/index";
import RepairsIndex from "@/pages/helpdesk/assets/repairs/index";
import DepreciationDashboard from "@/pages/helpdesk/assets/depreciation/index";
import ImportExportPage from "@/pages/helpdesk/assets/import-export";
```

**New tab triggers** will be inserted in logical order among existing tabs, each with an icon and text label matching the existing tab style (gap-1.5 text-xs with h-3.5 w-3.5 icon).

