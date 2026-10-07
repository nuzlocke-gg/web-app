# Skeleton

A pulsing `muted` block, `rounded-2xl` by default, that holds the place of content while it loads.

## When to use

- While run data, team cards or tables load, in the shape of what will appear.
- Not for actions in progress; use Spinner or a loading Button.

## What you provide

- Size with `className` (`h-4 w-3/4`, `size-12`). Change the radius for round shapes (`rounded-full`).
- Nothing else: it has no children and no props of its own.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `className` | size and radius classes | `animate-pulse rounded-2xl bg-muted` |

All other props go to the `<div>`.

## Do and don't

- Do match the real layout: same heights, widths and gaps as the loaded content.
- Do use `rounded-full` for avatars and sprites.
- Don't change the color away from `muted`; it must read as a placeholder.

Source: `packages/ui/src/components/skeleton.tsx`.
