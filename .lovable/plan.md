

# Move Logs to Advanced & Vendors to Setup

## Changes

### 1. `src/layouts/AssetsLayout.tsx`
- Remove the "Logs" sidebar entry (line 8) and its `ScrollText` icon import
- Sidebar becomes: Dashboard, All Assets, Add Asset, Check Out, Check In, Advanced

### 2. `src/pages/helpdesk/assets/advanced/index.tsx`

**Add "Logs" as a new top-level tab:**
- Add `"logs"` to the `VALID_TABS` array (line 384)
- Add a `TabsTrigger` for "Logs" (after Reports, before Setup)
- Add a `TabsContent` that renders `AssetLogsPage` embedded inline
- Import `AssetLogsPage` from `@/pages/helpdesk/assets/AssetLogsPage`

**Move "Vendors" from top-level tab to Setup sub-tab:**
- Remove `"vendors"` from `VALID_TABS` array
- Remove the `TabsTrigger` for "Vendors" (line 1258)
- Remove the `TabsContent` for "Vendors" (the vendors card/table section)
- Add `{ id: "vendors", label: "Vendors" }` to the `SETUP_TABS` array (line 305)
- Update `SetupTabId` type automatically (it derives from `SETUP_TABS`)
- Add vendor rendering logic inside `renderSetupContent()` when `setupSubTab === "vendors"` -- this will render the existing vendors table/card content that's currently in the vendors TabsContent
- Show vendor count in the Setup sub-tab button like other setup items

### Result
- **Top-level Advanced tabs**: Employees, Licenses, Repairs, Warranties, Depreciation, Documents, Import/Export, Reports, Logs, Setup
- **Setup sub-tabs**: Sites and Locations, Categories, Departments, Makes, Emails, Vendors

