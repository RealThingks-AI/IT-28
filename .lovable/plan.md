

# Remove Verification Children from Sidebar, Add Toggle Buttons on Page

## Overview
Remove the expandable children (Overview, Overdue, Denied) from the Verification sidebar item. Instead, make Verification a simple link. On the verification page itself, add toggle buttons (like a ToggleGroup/button bar) for "All", "Overdue", and "Denied" that filter the table content inline.

## Changes

### 1. `src/layouts/AssetsLayout.tsx`
- Remove the `children` array from the Verification sidebar item
- Remove unused `Clock` and `XCircle` icon imports
- Verification becomes a simple flat link: `{ title: "Verification", url: "/assets/verification", icon: ShieldCheck }`

### 2. `src/pages/helpdesk/assets/verification/index.tsx`
- The page already has stat card filters and a status dropdown — these already serve as the "toggle" mechanism for All/Overdue/Denied/Confirmed/Pending
- Add a compact **ToggleGroup** bar (using the existing `ToggleGroup`/`ToggleGroupItem` components) right below the stat cards with options: **All**, **Overdue**, **Denied**, **Confirmed**, **Pending**
- Wire the toggle group to the existing `filter` state so clicking a toggle updates the table filter (same as clicking stat cards)
- Remove the `Select` dropdown for status filtering since the toggle group replaces it
- This gives users the same navigation that was previously in the sidebar, but directly on the page

