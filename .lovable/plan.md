

# Fix: Category/Setup Item Delete Foreign Key Error

## Problem
Deleting a category (or any setup item like site, location, department, make) fails with:
> "update or delete on table 'itam_categories' violates foreign key constraint 'itam_assets_category_id_fkey' on table 'itam_assets'"

This happens because the delete operation uses a hard `DELETE` SQL statement, but assets reference these items via foreign keys.

## Solution
Replace hard delete with **soft delete** (set `is_active = false`) for all setup items. This is consistent with how `itam_categories`, `itam_sites`, `itam_locations`, `itam_departments`, and `itam_makes` tables already have an `is_active` column. The existing queries already filter by `is_active = true`, so deactivated items will automatically stop appearing in dropdowns.

## Changes

### File: `src/pages/helpdesk/assets/advanced/index.tsx`

**1. Update `deleteMutation` (line ~326-346)**
- Replace `.delete().eq("id", id)` with `.update({ is_active: false }).eq("id", id)`
- Update success message to "Deactivated successfully"

**2. Update delete confirmation dialog text**
- Change wording from "delete" to "deactivate" to make the action clear to users
- Explain that the item will be hidden but not permanently removed

**3. Update delete button tooltip/label**
- Optionally change the trash icon action label to clarify it deactivates rather than deletes

## Technical Detail

```typescript
// Before (hard delete - causes FK error):
const { error } = await supabase.from(tableName).delete().eq("id", id);

// After (soft delete - safe):
const { error } = await supabase
  .from(tableName)
  .update({ is_active: false, updated_at: new Date().toISOString() })
  .eq("id", id);
```

Since `useAssetSetupConfig` already filters with `.eq("is_active", true)`, deactivated items will automatically disappear from all dropdowns and lists without any additional code changes.

