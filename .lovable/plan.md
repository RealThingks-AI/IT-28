

# Advanced Tab -- Full Audit & Cleanup Plan

## Scope
Deep audit of all 10 subsections under the Advanced tab: Employees, Vendors, Licenses, Repairs, Warranties, Depreciation, Documents, Import/Export, Reports, and Setup. Covers bugs, UI inconsistencies, missing features, and cleanup.

---

## Bugs Found

### B1. Depreciation empty state icon oversized
The asset depreciation empty state uses `h-10 w-10` for the `TrendingDown` icon (depreciation/index.tsx line 438), while all other tabs use `h-8 w-8`. Fix to `h-8 w-8`.

### B2. Depreciation stat cards not using shared StatCard
Depreciation renders 4 inline stat cards with raw Card/CardContent markup (lines 248-293) instead of using the shared `StatCard` component defined at line 318 of advanced/index.tsx. This creates subtle styling drift.

### B3. Select trigger heights inconsistent
- Employee/Warranty/Repair filter Selects use `h-9` (default) with no explicit height
- The Repairs status `SelectTrigger` has no `h-8` class, making it taller than the `h-8` search input next to it
- Fix: Add `h-8` to all filter `SelectTrigger` components for uniformity with the search inputs

### B4. Reports tab has no search/filter
With 40+ report cards across 7 categories, there's no way to quickly find a specific report. Add a search input that filters report cards by title/description.

### B5. Warranty table rows missing `cursor-pointer`
Unlike Employees, Vendors, and Repairs rows (which have `cursor-pointer` since they navigate on click), Warranty rows have no cursor pointer and no row-click navigation to asset detail. The "Action" button exists but the row itself isn't clickable.

### B6. Import/Export `CardHeader` padding inconsistency
When embedded, Import/Export still renders `CardHeader` with `CardTitle`/`CardDescription` which adds extra vertical padding compared to the compact inline header style used by Employees, Vendors, Repairs, and Warranties tabs.

### B7. Documents tab delete has no confirmation
Clicking the trash icon on a photo or document immediately triggers deletion with no confirmation dialog. All other delete actions in the app use a confirmation dialog. Add confirmation before destructive actions.

### B8. Warranty/Repair rows not navigating on row click
Warranty rows have no `onClick` on the `TableRow` -- only a small external-link button. Add row-click navigation to `/assets/detail/${asset.id}` (consistent with how Employee and Vendor rows work).

---

## UI/UX Improvements

### U1. Standardize all filter Select heights to `h-8`
All `SelectTrigger` components in the Advanced tab should use `className="w-[140px] h-8"` to match the `h-8` search inputs.

### U2. Add search to Reports tab
Add a search `Input` above the Accordion that filters report categories and individual report cards by title or description. Show a "No reports match" empty state when no results.

### U3. Add row-click navigation to Warranty rows
Add `cursor-pointer` and `onClick={() => navigate(`/assets/detail/${asset.id}`)}` to warranty `TableRow` elements, matching the pattern used by Employees, Vendors, and Repairs.

### U4. Depreciation: use shared StatCard component
Replace the 4 inline card blocks in depreciation/index.tsx (lines 248-293) with the shared `StatCard` component. Import it from advanced/index.tsx or extract it to a shared file.

### U5. Documents delete confirmation
Wrap photo and document delete actions in a small confirmation dialog (or use `window.confirm()` as a lightweight alternative) before executing the mutation.

### U6. Depreciation empty state icon size
Change `h-10 w-10` to `h-8 w-8` on line 438 of depreciation/index.tsx.

### U7. Add `transition-colors` to depreciation asset table rows
Depreciation asset rows (line 444) have no hover or transition. Add `hover:bg-muted/50 transition-colors` for consistency.

### U8. Import/Export embedded mode: compact headers
When `embedded`, skip `CardHeader` and use the inline header pattern (`<div className="flex items-center gap-3">`) for compactness, matching other tabs.

### U9. Reports tab: expand first category by default
Already done (`defaultValue={defaultOpen}`) -- verified working.

### U10. Add loading skeleton to Reports tab
Currently shows a single centered spinner. Replace with skeleton cards matching the report card layout for a smoother loading experience.

---

## Changes Plan

### File 1: `src/pages/helpdesk/assets/advanced/index.tsx`

| # | Change | Lines |
|---|--------|-------|
| 1 | Export `StatCard` component so depreciation page can import it | 318-337 |
| 2 | Add `h-8` to all filter `SelectTrigger` classNames (Employees role filter, status filter; Repairs status filter; Warranty status filter) | 1340, 1352, 1647, 1769 |
| 3 | Add `cursor-pointer` and `onClick` navigation to Warranty `TableRow` | 1833 |

### File 2: `src/pages/helpdesk/assets/depreciation/index.tsx`

| # | Change | Lines |
|---|--------|-------|
| 4 | Import shared `StatCard` from advanced/index (or extract to shared component) and replace 4 inline stat card blocks | 248-293 |
| 5 | Change empty state icon from `h-10 w-10` to `h-8 w-8` | 438 |
| 6 | Add `hover:bg-muted/50 transition-colors` to asset depreciation table rows | 444 |

### File 3: `src/pages/helpdesk/assets/reports.tsx`

| # | Change | Lines |
|---|--------|-------|
| 7 | Add search state and Input filter above Accordion | ~126-133 |
| 8 | Filter `reportCategories` by search term matching report title/description | ~133-161 |

### File 4: `src/pages/helpdesk/assets/import-export.tsx`

| # | Change | Lines |
|---|--------|-------|
| 9 | When `embedded`, use compact inline headers instead of `CardHeader` | 143-149, 211-217, 366-376 |

### File 5: New shared component `src/components/helpdesk/assets/StatCard.tsx`

| # | Change |
|---|--------|
| 10 | Extract `StatCard` to a shared component file so both advanced/index.tsx and depreciation/index.tsx can import it cleanly |

---

## What's Already Working Well (No Changes Needed)

- **Employees tab**: Sorting, filtering by role/status, pagination, avatar initials, asset count, employee assets dialog, export CSV, "Manage Users" link -- all solid
- **Vendors tab**: Sorting, search, navigation to detail, email/website links, asset counts, dropdown actions -- clean
- **Repairs tab**: Sortable headers, status filtering, days-open highlighting (red >14d, amber >7d), create repair link, export -- good
- **Licenses tab**: Stats cards, utilization progress bars, expiry highlighting, pagination, card-wrapped table -- well done
- **Setup tab**: Sites/Locations unified view, Categories with tag format config, Departments, Makes, Emails -- all CRUD working, asset counts shown
- **URL sync**: Tab and section state properly synced to URL params via `useSearchParams`
- **Pagination**: Consistent 50 items/page across all tabs with proper controls
- **Documents tab**: Inline photo gallery + document list with loading skeletons -- functional

## Technical Notes

- Total changes: ~10 edits across 5 files. All are safe, non-breaking UI polish changes.
- The shared `StatCard` extraction prevents style drift between tabs.
- No database changes needed.
- No new dependencies needed.

