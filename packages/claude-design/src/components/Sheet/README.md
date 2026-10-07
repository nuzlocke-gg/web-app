# Sheet

A panel that slides in from an edge of the screen for longer tasks or details, such as logging an encounter.

## When to use

- Forms with several fields: log an encounter, edit run rules.
- Details for a row that should keep the page in context: a Pokémon's stats and history.
- For a short task, use Dialog. For a touch-first bottom panel with swipe, use Drawer.

## What you provide

- `SheetTitle` (the accessible name) and usually `SheetDescription`, inside `SheetHeader`.
- Body content with horizontal padding (`px-6`) to match header and footer.
- `SheetFooter` with the main action and a `SheetClose` for Cancel.
- `SheetTrigger` with `render={<Button … />}`, or control `open`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `open` / `defaultOpen` | boolean | `false` |
| `onOpenChange` | `(open, details) => void` | — |
| `modal` | `true` `false` `"trap-focus"` | `true` |
| `SheetContent` `side` | `top` `right` `bottom` `left` | `right` |
| `SheetContent` `showCloseButton` | boolean | `true` |

Left and right sheets are `w-3/4`, `sm:max-w-sm`, full height. Top and bottom sheets are full width, auto height. `Sheet` is the Base UI `Dialog.Root`.

## Parts

- `SheetTrigger` — opens the sheet.
- `SheetContent` — the panel, `bg-popover` with a border on the inner edge. Renders portal and overlay.
- `SheetHeader` — title and description, `p-6`.
- `SheetTitle` — `text-base font-medium`.
- `SheetDescription` — `text-sm text-muted-foreground`.
- `SheetFooter` — `mt-auto`, `p-6`, stacked buttons.
- `SheetClose` — closes the sheet; use with `render`.

## Do and don't

- Do put the main action first in `SheetFooter`; buttons stack in a column.
- Do use `side="right"` for detail and edit panels.
- Don't nest a Sheet in a Dialog.

Source: `packages/ui/src/components/sheet.tsx`.
