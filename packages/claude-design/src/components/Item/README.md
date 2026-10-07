# Item

A flexible `rounded-2xl` row with media, title, description and actions for lists of things like encounters, team members or deaths.

## When to use

- Lists where each entry has an icon or sprite, a name, a short detail and maybe an action.
- `outline` for standalone rows, `muted` for soft emphasis, `default` (no border) inside other surfaces.
- Not for tabular data with many columns; use Table.

## What you provide

- `ItemMedia` with an icon (`variant="icon"`) or an image (`variant="image"`).
- `ItemContent` with `ItemTitle` and optional `ItemDescription` (two lines max).
- `ItemActions` for buttons or a value on the right.
- `render` to make the whole row a link (`<a>` rows get a `muted` hover).
- Wrap rows in `ItemGroup` (`role="list"`).

## Props

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `Item` | `variant` | `default` `outline` `muted` | `default` |
| `Item` | `size` | `default` (px 16, py 14) `sm` (px 14, py 12) `xs` (px 12, py 10) | `default` |
| `Item` | `render` | element or function (Base UI) | `<div>` |
| `ItemMedia` | `variant` | `default` `icon` (16px svg) `image` (40px, 32px `sm`, 24px `xs`) | `default` |

## Parts

- `ItemGroup` — a vertical list; gap 16px (10px with `sm` items, 8px with `xs`).
- `ItemSeparator` — a horizontal Separator with 8px margin.
- `ItemMedia` — the leading icon or image.
- `ItemContent` — the text column.
- `ItemTitle` — one line, `font-medium`.
- `ItemDescription` — up to two lines, `muted-foreground`.
- `ItemActions` — the trailing row of controls.
- `ItemHeader` / `ItemFooter` — full-width rows above or below the main row.

## Do and don't

- Do use the same `size` for every Item in a group.
- Do give icon-only buttons in `ItemActions` an `aria-label`.
- Don't put long text in `ItemTitle`; it clamps to one line.

Source: `packages/ui/src/components/item.tsx`.
