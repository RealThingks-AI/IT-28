

# Improve Header Bar: Admin Panel, Notifications & User Section

## Problem
The right side of the header bar looks cramped and visually inconsistent -- the Admin Panel button, notification bell, and user avatar/name are all plain ghost buttons with no visual separation or hierarchy.

## Changes (single file: `src/pages/ModuleLauncher.tsx`)

### Header Right Section (lines 142-192)

1. **Admin Panel button**: Style as a subtle outlined badge-like button with a faint rose/red tint to match the admin module color. Add `rounded-full` for a pill shape, smaller padding.

2. **Notification bell**: Add a subtle separator (thin vertical divider) between the admin button and the bell. Keep existing `NotificationPanel` component but wrap it for spacing.

3. **User section**: 
   - Add a vertical separator before the user dropdown
   - Increase avatar size slightly (`h-8 w-8`) with a stronger border ring
   - Show user name with slightly bolder styling
   - Add a subtle chevron-down indicator next to the name to signal it's a dropdown

4. **Overall spacing**: Change `gap-2` to `gap-1` on the container and use separators for visual grouping instead of uniform gaps. Group items logically:
   - Group 1: Admin Panel (if admin)
   - Separator
   - Group 2: Notification bell
   - Separator  
   - Group 3: Avatar + Name + ChevronDown

### Technical Details

- Import `ChevronDown` from lucide-react
- Import `Separator` from `@/components/ui/separator`
- Restyle the Admin Panel button: `variant="outline"` with `className="gap-1.5 rounded-full text-xs h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"`
- Add `<Separator orientation="vertical" className="h-5" />` between groups
- User trigger button: increase avatar to `h-8 w-8`, add `ChevronDown` icon (`h-3 w-3 text-muted-foreground`), keep truncated name

### Result
- Clear visual grouping and hierarchy in the header
- Admin button stands out with its own color identity
- Separators provide clean visual breaks
- User section feels more polished with dropdown indicator
- Consistent with modern SaaS dashboard headers

