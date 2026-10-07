# Popover

A small floating panel attached to a trigger, for quick settings or extra detail without leaving the page.

## When to use

- Small, interactive content: a route filter, a level input, a quick note.
- Content the user opens on purpose with a click.
- For a hint on hover, use Tooltip. For a list of actions, use DropdownMenu.

## What you provide

- `PopoverTrigger` with `render={<Button … />}`.
- `PopoverContent` with a `PopoverHeader` (title + description) and the controls.
- `PopoverTitle` gives the popup its accessible name.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `open` / `defaultOpen` | boolean | `false` |
| `onOpenChange` | `(open, details) => void` | — |
| `modal` | `true` `false` `"trap-focus"` | `false` |
| `PopoverContent` `side` | `top` `right` `bottom` `left` `inline-start` `inline-end` | `bottom` |
| `PopoverContent` `align` | `start` `center` `end` | `center` |
| `PopoverContent` `sideOffset` / `alignOffset` | number (px) | `4` / `0` |

## Parts

- `PopoverTrigger` — the button that opens the popover.
- `PopoverContent` — the panel: `w-72`, `rounded-3xl`, `bg-popover`, `p-4`, `gap-4`, `shadow-lg`. Renders portal and positioner.
- `PopoverHeader` — column for title and description.
- `PopoverTitle` — `text-base font-medium`.
- `PopoverDescription` — `text-muted-foreground`.

## Do and don't

- Do keep the content short; the panel is `w-72` (288px).
- Do use `size="sm"` buttons inside.
- Don't put a whole form in a popover; use Dialog or Sheet.

Source: `packages/ui/src/components/popover.tsx`.
