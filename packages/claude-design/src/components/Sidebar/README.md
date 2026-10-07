# Sidebar

A composable app sidebar with header, groups of menu buttons and footer, plus a provider that holds open/closed state and a Cmd/Ctrl+B shortcut.

## When to use

- The main navigation of the run tracker: Routes, Team, Graveyard, Rules, Settings.
- `collapsible="none"` for a fixed panel inside a layout; `offcanvas` or `icon` for a full-height app shell.

## What you provide

- `SidebarProvider` around both `Sidebar` and `SidebarInset` (it is a flex row, `min-h-svh` by default).
- In `Sidebar`: `SidebarHeader`, `SidebarContent` with one or more `SidebarGroup`s, and `SidebarFooter`.
- Each group: `SidebarGroupLabel` and `SidebarGroupContent` > `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton` (icon + `<span>` label).
- `isActive` on the current page's button; `tooltip` text so collapsed icon buttons stay labelled.
- `SidebarTrigger` in the page header to toggle (it has "Toggle Sidebar" for screen readers).

## Props

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `SidebarProvider` | `open` / `defaultOpen` / `onOpenChange` | boolean, saved to the `sidebar_state` cookie | `defaultOpen` `true` |
| `Sidebar` | `side` | `left` `right` | `left` |
| `Sidebar` | `variant` | `sidebar` `floating` `inset` | `sidebar` |
| `Sidebar` | `collapsible` | `offcanvas` `icon` `none` | `offcanvas` |
| `SidebarMenuButton` | `variant` | `default` `outline` | `default` |
| `SidebarMenuButton` | `size` | `default` (36px) `sm` (32px) `lg` (56px) | `default` |
| `SidebarMenuButton` | `isActive` / `tooltip` | boolean / string or TooltipContent props | `false` / — |
| `SidebarMenuAction` | `showOnHover` | boolean | `false` |
| `SidebarMenuSubButton` | `size` / `isActive` | `sm` `md` / boolean | `md` / `false` |
| `SidebarMenuSkeleton` | `showIcon` | boolean | `false` |

Widths: 16rem (18rem as a mobile Sheet below 768px), 3rem when collapsed to icons.

## Parts

- `SidebarProvider` — state, context and the `--sidebar-width` variables. `useSidebar()` reads it.
- `SidebarInset` — the main content area beside the sidebar (`<main>`); rounded when `variant="inset"`.
- `SidebarHeader` / `SidebarFooter` — top and bottom stacks, 8px padding.
- `SidebarContent` — the scrolling middle.
- `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarGroupContent` — a labelled section with an optional action.
- `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` — the nav list; buttons are `rounded-xl`.
- `SidebarMenuAction` — an icon button at the right of an item.
- `SidebarMenuBadge` — a count at the right of an item.
- `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` — a nested list with a left border.
- `SidebarMenuSkeleton` — a loading row.
- `SidebarInput`, `SidebarSeparator` — a 32px search field and a divider.
- `SidebarTrigger` — ghost `icon-sm` toggle button. `SidebarRail` — a thin edge you can click to toggle.

## Do and don't

- Do use `sidebar`, `sidebar-foreground` and `sidebar-accent` tokens for custom content inside.
- Do keep labels in a `<span>` so they truncate.
- Don't use `offcanvas` or `icon` inside a card or small panel: the container is `fixed` and `h-svh`, and hidden below `md`. Use `collapsible="none"` there.

Source: `packages/ui/src/components/sidebar.tsx`.
