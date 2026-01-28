
# Asset List View - Fixed Column Positions Implementation Plan

## Overview
Implement a system-controlled column order for the Asset List View where positions are fixed based on an `order_index`. Users can toggle column visibility but cannot reorder columns. Re-enabled columns return to their original fixed positions.

## Defined Column Order (per requirements)

| Index | Column ID | Label | Required |
|-------|-----------|-------|----------|
| 0 | asset_tag | Asset Tag ID | Yes (always visible, cannot disable) |
| 1 | category | Category | No |
| 2 | status | Status | No |
| 3 | make | Make | No |
| 4 | model | Model | No |
| 5 | serial_number | Serial No | No |
| 6 | assigned_to | Assigned To | No |
| 7 | asset_configuration | Asset Configuration | No |
| 8 | description | Description | No |
| 9 | cost | Cost | No |
| 10 | purchase_date | Purchase Date | No |
| 11 | purchased_from | Purchased From | No |
| 12 | asset_classification | Asset Classification | No |
| 13 | department | Department | No |
| 14 | location | Location | No |
| 15 | site | Site | No |
| 16 | asset_photo | Asset Photo | No |
| 17 | event_date | Event Date | No |
| 18 | event_due_date | Event Due Date | No |
| 19 | event_notes | Event Notes | No |
| 20 | created_by | Created By | No |
| 21 | created_at | Date Created | No |

## Implementation Steps

### Step 1: Update AssetColumnSettings.tsx
**Changes:**
- Add `order_index` property to each column definition
- Update `DEFAULT_ASSET_COLUMNS` with the new fixed order
- Remove drag-and-drop reordering functionality (remove `GripVertical` icon)
- Ensure columns are always sorted by `order_index` when retrieved
- Mark Asset Tag ID as `required: true` and `locked: true`

### Step 2: Update AssetsList.tsx
**Changes:**
- Modify column retrieval to always sort by `order_index`
- Ensure visible columns maintain their fixed positions
- Add "Asset Photo" column as a button that opens the image on click

### Step 3: Update getAssetColumnSettings() Helper
**Changes:**
- Always sort returned columns by `order_index`
- When merging saved settings with defaults, preserve `order_index` from defaults (ignore any saved order changes from previous versions)

### Step 4: Update Column Settings Dialog UI
**Changes:**
- Remove drag handle icons since reordering is disabled
- Display columns grouped by category but in fixed order within each group
- Show clear indication that Asset Tag ID cannot be disabled

### Step 5: Export Functionality (Future-Ready)
**Changes:**
- Update `handleExportToExcel` in AssetModuleTopBar.tsx to use the fixed column order
- Export only visible columns in the correct `order_index` sequence

### Step 6: Saved Views Integration (Future-Ready)
**Note:** The current asset module does not have saved views yet (unlike the helpdesk tickets module), but the column structure will be compatible when implemented.

## Technical Details

### Updated DEFAULT_ASSET_COLUMNS Structure
```typescript
const SYSTEM_COLUMN_ORDER: AssetColumn[] = [
  { id: "asset_tag", label: "Asset Tag ID", visible: true, locked: true, required: true, order_index: 0 },
  { id: "category", label: "Category", visible: true, order_index: 1 },
  { id: "status", label: "Status", visible: true, order_index: 2 },
  { id: "make", label: "Make", visible: true, order_index: 3 },
  { id: "model", label: "Model", visible: true, order_index: 4 },
  { id: "serial_number", label: "Serial No", visible: true, order_index: 5 },
  { id: "assigned_to", label: "Assigned To", visible: true, order_index: 6 },
  { id: "asset_configuration", label: "Asset Configuration", visible: false, order_index: 7 },
  { id: "description", label: "Description", visible: false, order_index: 8 },
  { id: "cost", label: "Cost", visible: true, order_index: 9 },
  { id: "purchase_date", label: "Purchase Date", visible: false, order_index: 10 },
  { id: "purchased_from", label: "Purchased From", visible: false, order_index: 11 },
  { id: "asset_classification", label: "Asset Classification", visible: false, order_index: 12 },
  { id: "department", label: "Department", visible: false, order_index: 13 },
  { id: "location", label: "Location", visible: true, order_index: 14 },
  { id: "site", label: "Site", visible: false, order_index: 15 },
  { id: "asset_photo", label: "Asset Photo", visible: false, order_index: 16 },
  { id: "event_date", label: "Event Date", visible: false, order_index: 17 },
  { id: "event_due_date", label: "Event Due Date", visible: false, order_index: 18 },
  { id: "event_notes", label: "Event Notes", visible: false, order_index: 19 },
  { id: "created_by", label: "Created By", visible: false, order_index: 20 },
  { id: "created_at", label: "Date Created", visible: false, order_index: 21 },
];
```

### Key Behaviors
1. **Fixed Positions**: Columns always appear in `order_index` order regardless of visibility changes
2. **Toggle Only**: Column settings dialog only allows show/hide, no drag-and-drop
3. **Persistence**: localStorage saves only visibility state, not order (order is always system-defined)
4. **Migration**: Existing saved settings will be migrated to use the new fixed order

### Asset Photo Column
The Asset Photo column will render as a button. When clicked:
- If photo exists: Opens a modal/preview showing the full image
- If no photo: Shows a placeholder icon indicating no photo available

## Files to Modify
1. `src/components/helpdesk/assets/AssetColumnSettings.tsx` - Column definitions and settings dialog
2. `src/components/helpdesk/assets/AssetsList.tsx` - Table rendering with fixed order
3. `src/components/helpdesk/assets/AssetModuleTopBar.tsx` - Export functionality alignment

## Validation Checklist
- Asset Tag ID is always first column
- Asset Tag ID cannot be hidden
- Hidden columns retain their position when re-enabled
- Column order matches the defined specification
- Export uses the same fixed column order
