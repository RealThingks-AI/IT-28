
# Comprehensive Asset Module Cleanup and Performance Optimization

## Summary
A deep cleanup of the entire app focusing on the Asset module's UI consistency, performance, bugs, and code quality. Changes are grouped into phases for manageable implementation.

---

## Phase 1: Performance -- Page Load Speed

### Problem
Every page takes too long to load due to lazy loading with Suspense showing a blank "Loading..." screen. Additionally, after mutations the entire page re-fetches everything.

### Changes

**File: `src/App.tsx`**
- Eagerly import the most frequently visited pages (AssetDashboard, AllAssets, HelpdeskSettings, AssetAdvancedPage) instead of lazy loading them
- Keep lazy loading only for rarely visited pages (depreciation, bulk-actions, import-export, etc.)

**File: `src/App.tsx` -- QueryClient config**
- Increase `staleTime` to 5 minutes for less frequent refetching
- Keep `refetchOnMount: false` and `refetchOnWindowFocus: false`

**File: `src/pages/helpdesk/layout.tsx`**
- Add `key={location.pathname}` removal -- ensure Outlet does NOT remount on every navigation (currently fine, just verify)
- Remove the full-page Loader2 spinner during auth loading -- use a lighter skeleton or instant redirect

---

## Phase 2: Prevent Full Page Refresh After Mutations

### Problem
After any data change (create/update/delete), `invalidateQueries` causes all queries on the page to refetch, which triggers loading states and re-renders the entire page.

### Changes

**Across all mutation `onSuccess` handlers:**
- Use targeted `queryClient.setQueryData()` for optimistic updates where possible
- For `invalidateQueries`, pass `{ refetchType: 'none' }` for queries that don't need immediate refetch, or use `exact: true` to avoid broad invalidation
- Ensure only the specific changed query key is invalidated, not broad patterns

**File: `src/App.tsx` -- QueryClient**
- Set `structuralSharing: true` (default) to prevent unnecessary re-renders when data hasn't changed

---

## Phase 3: UI Consistency -- Remove Pill Buttons, Compact Layout

### Problem
Inconsistent button styles, pill shapes, spacing, and font sizes across the app.

### Changes

**File: `src/components/ui/badge.tsx`**
- Already uses `rounded-md` (not pill) -- confirmed OK

**File: `src/components/ui/button.tsx`**  
- Verify no `rounded-full` variants exist -- confirmed OK, uses `rounded-md`

**Across all pages using `rounded-full` for buttons/badges:**
- Replace `rounded-full` with `rounded-md` or `rounded-lg` where used on interactive elements (buttons, badges, tags)
- Keep `rounded-full` only for: avatar circles, status dots, loading spinners, progress bars, scroll thumbs

**Specific files to update (interactive pill buttons only):**
- `src/components/helpdesk/assets/DashboardCalendar.tsx` -- legend dots (keep, they're status indicators)
- `src/pages/helpdesk/tickets/dashboard.tsx` -- status dots (keep)
- Loading spinners -- keep `rounded-full`
- Any actual pill-shaped buttons or clickable badges -- change to `rounded-md`

---

## Phase 4: Asset Detail Page Fixes

### Problem
The asset detail page has layout issues visible in the screenshot: duplicate data between header card and Details tab, inconsistent spacing.

### Changes

**File: `src/pages/helpdesk/assets/detail/[assetId].tsx`**
- Remove the "More Actions" button's green color (`bg-green-600`) -- use `variant="default"` for consistency
- Ensure the status Badge does not use pill styling
- Compact the header card table padding

**File: `src/pages/helpdesk/assets/detail/[assetId]/tabs/DetailsTab.tsx`**
- The Details tab duplicates info already shown in the header card (Serial Number, Model, Category, Department, Location, Purchase Date, Purchase Price, Warranty Expiry)
- Remove duplicated fields or restructure to show only additional details not in the header
- Ensure consistent text sizes (all `text-sm` for values, `text-xs text-muted-foreground` for labels)

---

## Phase 5: Remove Organisation References

### Problem
Code still references `organisation_id` in several places despite being a single-company app.

### Changes

**File: `src/pages/helpdesk/system-updates/settings.tsx`**
- Remove comment about `organisation_id` (line 15)

**File: `src/pages/helpdesk/assets/advanced/index.tsx`**
- Change "Manage ... for your organization" text to "Manage ... for your company" (line 467)

**File: `src/components/helpdesk/assets/setup/CompanyInfoTab.tsx`**
- Change "Update your organization details" to "Update your company details" (line 102)

**File: `src/components/settings/AdminSystem.tsx`**
- Change "Organization Settings" / "Organization Name" / "organization's standard working hours" to use "Company" instead (lines 446-489)

**File: `src/components/settings/AdminLogs.tsx`**
- Change "your organization" to "your company" (line 309)

**Note:** `src/integrations/supabase/types.ts` cannot be edited (auto-generated) -- these references will remain but are harmless.

---

## Phase 6: Form Field Width Consistency

### Problem
Form fields use full width unnecessarily.

### Changes

**File: `src/pages/helpdesk/assets/add.tsx`**
- Add `max-w-xs` or `max-w-sm` to form inputs where appropriate (dropdowns, text inputs)
- Use grid layout with `grid-cols-2` or `grid-cols-3` for compact form layout

**Across all dialog forms (QuickAddFieldDialog, CheckOutDialog, CheckInDialog, etc.):**
- Ensure inputs don't stretch beyond `max-w-md` inside dialogs

---

## Phase 7: Card Click Redirections

### Changes

**File: `src/pages/helpdesk/assets/dashboard.tsx`**
- Verify all stat cards have correct `onClick` navigation
- Ensure "Warranty Expiring" and "Lease Expiring" cards navigate to filtered views
- Ensure feed items (Checked In, Checked Out, etc.) navigate to correct asset detail pages

---

## Phase 8: Duplicate/Unwanted Text Cleanup

### Changes

**File: `src/pages/helpdesk/layout.tsx`**
- Clean up `routeTitles` -- remove entries for deprecated/redirected routes (e.g., `/assets/setup`, `/assets/lists/maintenances`, etc.)
- Remove entries that are no longer reachable

**File: `src/pages/helpdesk/assets/detail/[assetId].tsx`**
- The header shows "Computer equipment" (category name) as h1 and also shows Category in the table -- remove one instance

---

## Phase 9: Pagination Consistency

### Changes
- Verify all list pages (AllAssets, Repairs, Vendors, Licenses, Purchase Orders) use the same pagination style
- Ensure pagination is sticky at bottom with consistent per-page options

---

## Files to Modify (Summary)

| File | Changes |
|------|---------|
| `src/App.tsx` | Eager imports for key pages, QueryClient tuning |
| `src/pages/helpdesk/layout.tsx` | Clean up routeTitles, lighter auth loading |
| `src/pages/helpdesk/assets/detail/[assetId].tsx` | Remove green button, fix duplicate data, compact layout |
| `src/pages/helpdesk/assets/detail/[assetId]/tabs/DetailsTab.tsx` | Remove duplicated fields shown in header |
| `src/pages/helpdesk/assets/dashboard.tsx` | Verify card clicks, consistent stat cards |
| `src/pages/helpdesk/assets/advanced/index.tsx` | Replace "organization" with "company" |
| `src/components/helpdesk/assets/setup/CompanyInfoTab.tsx` | Replace "organization" text |
| `src/components/settings/AdminSystem.tsx` | Replace "Organization" with "Company" |
| `src/components/settings/AdminLogs.tsx` | Replace "organization" text |
| `src/pages/helpdesk/system-updates/settings.tsx` | Remove organisation_id comment |
| `src/pages/helpdesk/assets/add.tsx` | Compact form field widths |
| Various mutation files | Targeted query invalidation |

## Estimated Scope
This is a large set of changes. Implementation will prioritize:
1. Performance fixes (biggest user impact)
2. UI consistency (pill buttons, spacing)
3. Bug fixes (duplicate data, redirections)
4. Text cleanup (organization references)
