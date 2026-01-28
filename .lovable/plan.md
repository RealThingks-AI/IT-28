

# Plan: Update Setup Columns Modal with Correct Database Field Mappings

## Overview
Update the `AssetColumnSettings.tsx` component to include all requested fields organized into three categories: **Asset Fields**, **Linking Fields**, and **Event Fields**. This will also require updates to `AssetsList.tsx` to render the new columns with correct database field connections.

## Database Schema Analysis

After reviewing the `itam_assets` table schema, here are the verified database fields:

### itam_assets Table Fields (Verified from types.ts)
```
id: string
asset_id: string
asset_tag: string | null
name: string
description: string | null
model: string | null
serial_number: string | null
status: string | null
purchase_price: number | null
purchase_date: string | null
warranty_expiry: string | null
notes: string | null
qr_code: string | null
created_at: string | null
created_by: string | null          <- UUID reference to users table
updated_at: string | null
updated_by: string | null
is_active: boolean | null
custom_fields: Json | null         <- Contains: photo_url, asset_configuration, classification, currency, vendor, site_id
assigned_to: string | null
checked_out_at: string | null      <- Event Date
checked_out_to: string | null
check_out_notes: string | null     <- Event Notes
expected_return_date: string | null <- Event Due Date
category_id: string | null         <- FK to itam_categories
department_id: string | null       <- FK to itam_departments
location_id: string | null         <- FK to itam_locations (which has site_id FK to itam_sites)
make_id: string | null             <- FK to itam_makes
vendor_id: string | null           <- FK to itam_vendors
```

### Related Tables for Joins
- `itam_categories` -> name
- `itam_departments` -> name
- `itam_locations` -> name, site_id (FK to itam_sites)
- `itam_sites` -> name
- `itam_makes` -> name
- `itam_vendors` -> name
- `users` -> name (for created_by lookup)

---

## Complete Field-to-Database Mapping

| UI Field | Column ID | DB Field / Source | Notes |
|----------|-----------|-------------------|-------|
| **ASSET FIELDS** | | | |
| Asset Photo | `asset_photo` | `custom_fields.photo_url` | URL from asset-photos storage bucket |
| Asset Tag ID | `asset_tag` | `asset_tag` | Direct field (required/locked) |
| Make | `make` | `make_id` -> `itam_makes.name` | Join required |
| Cost | `cost` | `purchase_price` | Renamed label for display |
| Created By | `created_by` | `created_by` -> `users.name` | Join to users table needed |
| Date Created | `created_at` | `created_at` | Direct field |
| Description | `description` | `description` | Direct field |
| Model | `model` | `model` | Direct field |
| Purchase Date | `purchase_date` | `purchase_date` | Direct field |
| Purchased From | `purchased_from` | `vendor_id` -> `itam_vendors.name` | Join required |
| Serial No | `serial_number` | `serial_number` | Direct field |
| Asset Classification | `asset_classification` | `custom_fields.classification` | JSON field |
| Asset Configuration | `asset_configuration` | `custom_fields.asset_configuration` | JSON field |
| **LINKING FIELDS** | | | |
| Category | `category` | `category_id` -> `itam_categories.name` | Existing join |
| Department | `department` | `department_id` -> `itam_departments.name` | Existing join |
| Location | `location` | `location_id` -> `itam_locations.name` | Existing join |
| Site | `site` | `location.site_id` -> `itam_sites.name` | Nested join via location |
| **EVENT FIELDS** | | | |
| Assigned To | `assigned_to` | `assigned_to` | Direct field (text) |
| Event Date | `event_date` | `checked_out_at` | Direct field |
| Event Due Date | `event_due_date` | `expected_return_date` | Direct field |
| Event Notes | `event_notes` | `check_out_notes` | Direct field |
| Status | `status` | `status` | Direct field |

---

## Technical Implementation

### 1. Update `AssetColumnSettings.tsx`

**Add category support to interface:**
```typescript
export interface AssetColumn {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean;
  category?: "asset" | "linking" | "event";
}
```

**Replace DEFAULT_ASSET_COLUMNS with new structure (22 columns):**

```typescript
const DEFAULT_ASSET_COLUMNS: AssetColumn[] = [
  // Asset Fields
  { id: "asset_photo", label: "Asset Photo", visible: false, category: "asset" },
  { id: "asset_tag", label: "Asset Tag ID", visible: true, locked: true, category: "asset" },
  { id: "make", label: "Make", visible: true, category: "asset" },
  { id: "cost", label: "Cost", visible: true, category: "asset" },
  { id: "created_by", label: "Created By", visible: false, category: "asset" },
  { id: "created_at", label: "Date Created", visible: false, category: "asset" },
  { id: "description", label: "Description", visible: false, category: "asset" },
  { id: "model", label: "Model", visible: true, category: "asset" },
  { id: "purchase_date", label: "Purchase Date", visible: false, category: "asset" },
  { id: "purchased_from", label: "Purchased From", visible: false, category: "asset" },
  { id: "serial_number", label: "Serial No", visible: true, category: "asset" },
  { id: "asset_classification", label: "Asset Classification", visible: false, category: "asset" },
  { id: "asset_configuration", label: "Asset Configuration", visible: false, category: "asset" },
  
  // Linking Fields
  { id: "category", label: "Category", visible: true, category: "linking" },
  { id: "department", label: "Department", visible: false, category: "linking" },
  { id: "location", label: "Location", visible: true, category: "linking" },
  { id: "site", label: "Site", visible: false, category: "linking" },
  
  // Event Fields
  { id: "assigned_to", label: "Assigned To", visible: true, category: "event" },
  { id: "event_date", label: "Event Date", visible: false, category: "event" },
  { id: "event_due_date", label: "Event Due Date", visible: false, category: "event" },
  { id: "event_notes", label: "Event Notes", visible: false, category: "event" },
  { id: "status", label: "Status", visible: true, category: "event" },
];
```

**Update UI to show category headers** in the scroll area with section dividers.

### 2. Update `AssetsList.tsx`

**Update Supabase query to include additional joins:**
```typescript
let query = supabase.from("itam_assets").select(`
  *,
  category:itam_categories(id, name),
  location:itam_locations(id, name, site:itam_sites(id, name)),
  department:itam_departments(id, name),
  make:itam_makes(id, name),
  vendor:itam_vendors(id, name),
  creator:users!itam_assets_created_by_fkey(id, name)
`)
```

**Expand renderCell function** to handle all new column IDs:
- `asset_photo`: Display thumbnail from `custom_fields.photo_url` or placeholder
- `cost`: Map to `purchase_price` with currency formatting
- `created_by`: Display `creator.name` from joined users table
- `description`: Show truncated text
- `purchased_from`: Display `vendor.name`
- `asset_classification`: Parse `custom_fields.classification` JSON
- `asset_configuration`: Display `custom_fields.asset_configuration`
- `site`: Display `location.site.name` (nested join)
- `event_date`: Format `checked_out_at`
- `event_due_date`: Format `expected_return_date`
- `event_notes`: Display `check_out_notes`

---

## Files to Modify

1. **`src/components/helpdesk/assets/AssetColumnSettings.tsx`**
   - Add `category` property to `AssetColumn` interface
   - Replace column definitions with 22 categorized columns
   - Add category section headers in the UI

2. **`src/components/helpdesk/assets/AssetsList.tsx`**
   - Update Supabase select query with nested joins for site and creator
   - Expand `renderCell` switch statement for all new columns
   - Add helper functions for displaying photos, classifications, etc.

---

## Key Corrections from Previous Plan

| Field | Previous Assumption | Actual DB Field |
|-------|---------------------|-----------------|
| Asset Photo | Storage bucket only | `custom_fields.photo_url` (stores URL) |
| Site | Direct `site_id` on asset | Via `location.site_id` (nested through location) |
| Purchased From | `vendor` text field | `vendor_id` FK to `itam_vendors` |
| Created By | Just UUID display | Needs join to `users` table for name |
| Classification | `custom_fields.classification` | Correct - stores as JSON object |

