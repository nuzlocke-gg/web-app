# Separator

A 1px line that divides content horizontally or vertically.

## When to use

- Between sections in a panel or card: run summary and team.
- Between inline items in a row: Routes | Team | Graveyard.
- Not for space alone; use `gap` instead.

## What you provide

- `orientation="vertical"` inside a flex row with a set height; the line uses `self-stretch`.
- Nothing else. Base UI sets `role="separator"` and `aria-orientation`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `orientation` | `horizontal` (`h-px w-full`) `vertical` (`w-px`, full height) | `horizontal` |
| `render` | Base UI render prop | — |

Color is `bg-border`. All other props pass to the Base UI `Separator` (a `<div>`).

## Do and don't

- Do use the `border` token; don't set a custom color with `className`.
- Do give the parent row a height (`h-5`) for vertical separators.
- Don't stack separators with extra margin; space with the parent's `gap`.

Source: `packages/ui/src/components/separator.tsx`.
