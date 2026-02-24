

# Streamline Asset Sidebar and Optimize Advanced Section

## Overview
Remove rarely-used sidebar items (Dispose, Reserve, Purchase Orders, Logs, Audit) from the main navigation and consolidate them into the Advanced section. This creates a cleaner, more industry-standard sidebar with only the most important items visible.

## Current Sidebar (17 items - too many)
Dashboard, All Assets, Add Asset, Check Out, Check In, **Dispose**, **Reserve**, Vendors, Licenses, Repairs, **Purchase Orders**, Depreciation, Import/Export, Reports, **Logs**, **Audit**, Advanced

## New Sidebar (12 items - clean and focused)
Dashboard, All Assets, Add Asset, Check Out, Check In, Vendors, Licenses, Repairs, Depreciation, Import/Export, Reports, Advanced

## Changes

### 1. File: `src/layouts/AssetsLayout.tsx`
- Remove sidebar entries for: Dispose, Reserve, Purchase Orders, Logs, Audit
- These pages still exist and remain accessible via the Advanced section tabs

### 2. File: `src/pages/helpdesk/assets/advanced/index.tsx`
- Add new tabs: "Dispose", "Reserve", "Purchase Orders", "Logs", "Audit"
- These tabs will simply navigate to their existing pages (`/assets/dispose`, `/assets/reserve`, etc.) OR embed the content inline
- Since these pages already exist as standalone routes, the simplest approach is to add tabs that redirect to those pages, or add "Logs" and "Audit" as new tabs within Advanced

**Approach**: Add "Logs", "Audit", and "Purchase Orders" as new tabs in the Advanced page. For "Dispose" and "Reserve", these are action-oriented pages (forms) that work better as standalone -- they'll remain as routes but accessed via the "All Assets" page actions or asset detail page rather than the sidebar.

### 3. Advanced page tab updates
Current tabs: Employees, Vendors, Maintenances, Warranties, Tools, Reports, Setup

New tabs: Employees, Vendors, Maintenances, Warranties, Tools, Purchase Orders, Reports, Logs, Audit, Setup

### Technical Details

**`src/layouts/AssetsLayout.tsx`** -- Remove 5 sidebar items (Dispose, Reserve, Purchase Orders, Logs, Audit)

**`src/pages/helpdesk/assets/advanced/index.tsx`** -- Add 3 new TabsTrigger entries (Purchase Orders, Logs, Audit) with corresponding TabsContent that lazy-loads the existing page components. Import the existing components:
- `PurchaseOrdersList` from purchase-orders/index
- `AssetAudit` from audit/index  
- `AssetLogs` from AssetLogsPage

**Routes in `src/App.tsx`** -- Keep all existing routes intact so direct URL access and internal navigation still work.
