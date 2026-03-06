

# Add "Verification" Section to Assets Sidebar

## Overview
Add a new "Verification" sidebar item (with children) between "Check In" and "Employees" in the Assets module. This will provide a dedicated section for the verification workflow with sub-pages for an overview/dashboard, overdue assets, denied assets, and sending bulk confirmations.

## Changes

### 1. `src/layouts/AssetsLayout.tsx`
- Add a new sidebar item with `title: "Verification"` and `icon: ShieldCheck` between "Check In" and "Employees"
- Give it children:
  - **Overview** → `/assets/verification` — main verification dashboard page
  - **Overdue** → `/assets/allassets?confirmation=overdue` — links to filtered all-assets list
  - **Denied** → `/assets/allassets?confirmation=denied` — links to filtered all-assets list

### 2. New page: `src/pages/helpdesk/assets/verification/index.tsx`
- Dedicated verification overview page showing:
  - Summary stat cards: Total assets, Confirmed, Denied, Pending, Overdue (60-day cycle)
  - Table of all assets grouped by verification status with quick actions
  - "Bulk Verify Stock" button for available assets (no assigned user)
  - "Bulk Send Confirmation" button for assigned assets
  - Each row shows asset tag, name, status, assigned user, last confirmed date, and action buttons (Verify Stock / Send Confirmation / View Details)
- Queries `itam_assets` with `confirmation_status` and `last_confirmed_at`

### 3. `src/App.tsx`
- Add route: `<Route path="/assets/verification" element={<AssetVerification />} />`
- Add lazy import for the new verification page

### 4. `src/components/ModuleSidebar.tsx`
- No changes needed — already supports `children` in `SidebarItem` interface

## Technical Notes
- The "Overdue" and "Denied" children link to existing `/assets/allassets` with query params, reusing existing filter logic
- The new verification overview page reuses existing Supabase queries and mutation patterns from `AssetActionsMenu` and `EmployeeAssetsDialog`
- Bulk verify stock reuses the same `itam_assets` update + `itam_asset_history` insert pattern
- Bulk send confirmation reuses the `itam_asset_confirmations` + `send-asset-email` edge function pattern

