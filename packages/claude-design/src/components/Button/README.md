# Button

A pill-shaped button for actions; use `default` (purple) for the one main action in a view and quieter variants for the rest.

## When to use

- `default` — the primary action: "Start new run", "Save team". One per view.
- `secondary` — a neutral action next to the primary one.
- `outline` — toolbar and form actions that need an edge.
- `ghost` — low-emphasis actions: Cancel, icon actions in rows and headers.
- `destructive` — delete and release actions. A tinted fill (10% / 20% dark) with `destructive` text, never a solid red block.
- `link` — an action that reads as inline text.

## What you provide

- `children`: a short sentence-case label (verb + object). Icons go inside as children; mark them `data-icon="inline-start"` or `"inline-end"` so the padding tightens.
- For `icon`, `icon-xs`, `icon-sm`, `icon-lg` sizes: an icon only, plus `aria-label`.
- `render` (Base UI) to render as another element, such as a link.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `default` `outline` `secondary` `ghost` `destructive` `link` | `default` |
| `size` | `default` (36px) `xs` (24px) `sm` (32px) `lg` (40px) `icon` `icon-xs` `icon-sm` `icon-lg` | `default` |
| `disabled` | boolean — 50% opacity, no pointer events | `false` |

All other props pass to the Base UI `Button` (a `<button>`).

## Do and don't

- Do keep one `default` button per view.
- Don't change the radius or height with `className`; pick a `size`.
- Don't use the `link` variant in dark mode for important text: dark `primary` on `background` is low contrast (source value, kept).

Source: `packages/ui/src/components/button.tsx`. Also exports `buttonVariants` to style links as buttons.
