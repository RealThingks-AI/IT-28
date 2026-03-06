

# Add Confirmation Status to List View, Asset Detail & Email Actions

## Current State
- Dashboard has stat cards for "Pending Confirm" and "Denied" that link to `/assets/allassets?confirmation=overdue` and `?confirmation=denied` — but the list view does NOT consume these URL params
- `AssetsList.tsx` does NOT query `confirmation_status` or `last_confirmed_at`
- Asset detail page has no confirmation status indicator or "Send Confirmation Email" action
- `AssetActionsMenu.tsx` has "Email to User" (mailto) but no "Send Confirmation" action
- `EmployeeAssetsDialog.tsx` already has full confirmation flow with per-item confirm/deny URLs

## Changes

### 1. `src/pages/helpdesk/assets/allassets.tsx` — Add confirmation filter
- Read `confirmation` from `searchParams` and pass it in `filters`
- Add a "Confirmation" dropdown filter: All / Confirmed / Denied / Pending / Overdue
- Show it alongside existing Status and Type filters

### 2. `src/components/helpdesk/assets/AssetsList.tsx` — Add "Verified" column + filter logic
- Add `confirmation_status, last_confirmed_at` to the select query
- Add a new column after "Status": **Verified** — showing:
  - Green checkmark (confirmed)
  - Red X (denied)  
  - Amber clock (overdue — not confirmed in 60+ days)
  - Gray dash (never confirmed / not assigned)
- Add tooltip on hover with date/status details
- Implement `confirmation` filter logic in the query:
  - `confirmed` → `confirmation_status = "confirmed"`
  - `denied` → `confirmation_status = "denied"`
  - `pending` → `confirmation_status = "pending"`
  - `overdue` → assigned assets where `last_confirmed_at` is null or > 60 days (client-side filter since it's a computed condition)

### 3. `src/pages/helpdesk/assets/detail/[assetId].tsx` — Add confirmation status + email action
- Show confirmation status badge in the right info table (after Status row): "Confirmed", "Denied", "Pending", or "Not verified"
- Add "Send Confirmation Email" to the "More Actions" dropdown (only when asset is assigned)
- Reuse the same confirmation flow from `EmployeeAssetsDialog` (create `itam_asset_confirmations` record, create items, invoke `send-asset-email`)

### 4. `src/components/helpdesk/assets/AssetActionsMenu.tsx` — Add "Send Confirmation" action
- Add a "Send Confirmation" menu item (with ShieldCheck icon) — visible when `asset.assigned_to` exists
- On click, invoke the same edge function flow: create confirmation record + items + send email
- Requires fetching the assigned user's email first

### 5. `src/components/helpdesk/assets/AssetColumnSettings.tsx` — Register "Verified" column
- Add `{ id: "verified", label: "Verified", visible: true, order_index: 8 }` to `SYSTEM_COLUMN_ORDER`

## Technical Notes
- The 60-day overdue calculation is client-side (computed from `last_confirmed_at`)
- For the "overdue" filter in list view, we fetch all assigned assets and filter client-side since "overdue" is a computed condition, not a DB column value
- Confirmation email reuses existing `send-asset-email` edge function with `asset_confirmation` template
- No new DB tables or migrations needed
