# Dialog

A centered modal panel for a short task, such as editing a nickname, that blocks the page until the user closes it.

## When to use

- A focused task with a few fields: rename a Pokémon, edit run settings.
- Content that needs the user's full attention before they go back to the page.
- For a yes/no confirmation of a destructive action, use AlertDialog. For longer forms, use Sheet.

## What you provide

- `DialogTitle` (required for the accessible name) and usually `DialogDescription`.
- `DialogTrigger` with `render={<Button … />}` and a verb label, or control `open` yourself.
- Footer buttons: one `default` action and a `DialogClose` for Cancel.
- The close button (top right, `ghost` `icon-sm`, label "Close" for screen readers) is added for you.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `open` / `defaultOpen` | boolean | `false` |
| `onOpenChange` | `(open, details) => void` | — |
| `modal` | `true` `false` `"trap-focus"` | `true` |
| `disablePointerDismissal` | boolean | `false` |
| `DialogContent` `showCloseButton` | boolean | `true` |
| `DialogFooter` `showCloseButton` | boolean — adds an `outline` Close button | `false` |

`Dialog` is the Base UI `Dialog.Root`; it renders no element.

## Parts

- `DialogTrigger` — the button that opens the dialog.
- `DialogContent` — the panel: `rounded-4xl`, `bg-popover`, `p-6`, `gap-6`, `sm:max-w-md`. Renders the portal and overlay for you.
- `DialogHeader` — column for title and description (`gap-1.5`).
- `DialogTitle` — `text-base font-medium` heading.
- `DialogDescription` — `text-sm text-muted-foreground`.
- `DialogFooter` — buttons, stacked on small screens, right-aligned from `sm`.
- `DialogClose` — closes the dialog; use with `render`.
- `DialogOverlay`, `DialogPortal` — used inside `DialogContent`; export only for custom layouts.

## Do and don't

- Do keep one `default` button in the footer and put Cancel in `DialogClose`.
- Don't put a long form in a dialog; use Sheet.
- Don't change the `radius-4xl` corners or the `bg-black/30` overlay with `className`.

Source: `packages/ui/src/components/dialog.tsx`.
