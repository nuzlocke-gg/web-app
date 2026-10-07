# Card

A `rounded-4xl` `card` surface with a soft shadow that groups a header, content and footer about one thing.

## When to use

- One run, one Pokémon, one gym: a block of related content and its actions.
- `sm` size for dense grids and side panels.
- Not for every section on a page; plain spacing is often enough.

## What you provide

- `CardHeader` with `CardTitle` and, if needed, `CardDescription` and `CardAction` (top right).
- `CardContent` for the body and `CardFooter` for actions.
- An `<img>` as the first or last child goes edge to edge with matching corners.
- Add `border-b` to the header or `border-t` to the footer to get a divider with spacing.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `size` | `default` (24px spacing) `sm` (16px spacing) | `default` |

All other props go to the `<div>`.

## Parts

- `CardHeader` — grid of title, description and action.
- `CardTitle` — `font-heading text-base font-medium`.
- `CardDescription` — `text-sm muted-foreground`.
- `CardAction` — right column of the header, for a Badge or icon button.
- `CardContent` — horizontal padding only.
- `CardFooter` — a flex row for buttons.

## Do and don't

- Do keep one `default` Button in a footer and make the rest quieter.
- Don't override `radius-4xl` or the padding; pick `size` instead.
- Don't nest Cards; use Item or a `muted` block inside.

Source: `packages/ui/src/components/card.tsx`.
