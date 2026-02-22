

# Fix: Remove Page-Level Scrollbar

## Root Cause
The page-level scrollbar comes from `html` and `body` elements allowing vertical overflow. In `src/index.css`:
- `html` only has `overflow-x: hidden` (line 182) -- `overflow-y` defaults to `auto`, creating the vertical scrollbar
- `body` only has `overflow-x: hidden` (line 175) -- same issue
- `#root` has `min-height: 100vh` (line 191) which can push content taller than viewport

The layout already uses `h-screen overflow-hidden` but the browser still shows a scrollbar on `html`/`body` because those elements allow it.

## Changes

### `src/index.css`

1. **`body` (line 175)**: Change `overflow-x: hidden` to `overflow: hidden`
2. **`html` (line 182)**: Change `overflow-x: hidden` to `overflow: hidden`
3. **`#root` (line 191)**: Change `min-height: 100vh` to `height: 100vh` and add `overflow: hidden`

This ensures no page-level scrollbar can appear. The layout's flexbox structure and the table's `overflow-auto` remain the only scroll source.

## Result
- Zero page-level scrollbars
- Only the table body inside AssetsList scrolls
- All other pages continue working since they render inside the layout's `overflow-hidden` container
