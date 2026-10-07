# Drawer

A swipeable panel that slides in from an edge, made for touch screens, with optional snap points and a swipe handle.

## When to use

- Mobile actions and details: run rules, quick encounter entry.
- When the user should be able to swipe the panel closed.
- On desktop, prefer Sheet or Dialog.

## What you provide

- `DrawerTitle` (the accessible name) and usually `DrawerDescription`, inside `DrawerHeader`.
- Body content with `p-4` to match header and footer.
- `DrawerFooter` with the action and a `DrawerClose`.
- `DrawerTrigger` with `render={<Button … />}`, or control `open`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `open` / `defaultOpen` | boolean | `false` |
| `onOpenChange` | `(open, details) => void` | — |
| `swipeDirection` | `down` `up` `left` `right` — also sets the edge | `down` |
| `modal` | `true` `false` `"trap-focus"` — overlay shows only when `true` | `true` |
| `showSwipeHandle` | boolean — a 100px × 6px `bg-muted` bar | `false` |
| `snapPoints` | array of numbers (fraction or px) or strings | — |
| `snapPoint` / `defaultSnapPoint` / `onSnapPointChange` | controlled or initial snap point | — |
| `disablePointerDismissal` | boolean | `false` |

Bottom and top drawers are full width with `max-h` of `100dvh - 6rem`; side drawers are 75% wide, `sm:` 24rem. All have an 8px inset and `rounded-4xl` corners.

## Parts

- `DrawerTrigger` — opens the drawer.
- `DrawerContent` — the panel (`bg-popover`, `rounded-4xl`). Renders portal, overlay, viewport and the handle.
- `DrawerHeader` — `p-4 pb-0`; centered on up/down drawers below `md`.
- `DrawerTitle` — `text-base font-medium`.
- `DrawerDescription` — `text-sm text-muted-foreground`.
- `DrawerFooter` — `mt-auto`, `p-4 pt-0`, stacked buttons.
- `DrawerClose` — closes the drawer.
- `DrawerSwipeHandle` — the handle; added by `showSwipeHandle`.
- `DrawerOverlay`, `DrawerPortal` — used inside `DrawerContent`.

## Do and don't

- Do use `showSwipeHandle` on bottom drawers so the swipe is clear.
- Do keep one main action in the footer.
- Don't use a Drawer as a desktop side panel; use Sheet.

Source: `packages/ui/src/components/drawer.tsx`.
