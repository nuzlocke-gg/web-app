# Badge

A small 20px pill label for status and counts, such as Alive, Fainted or a route name.

## When to use

- `default` — the main or positive status: Alive, In party.
- `secondary` — a neutral status: Boxed.
- `destructive` — a loss or error: Fainted. A tinted fill (10% / 20% dark) with `destructive` text.
- `outline` — a tag or category with an edge: Route 102.
- `ghost` — quiet metadata: Lv. 14.
- `link` — a badge that goes somewhere; use with `render={<a href="…" />}`.
- Warning (not a variant; the `warning` token) — a caution that is not an error: Over level cap, Rule broken. Use `className="bg-warning/10 text-warning dark:bg-warning/20"` and a `WarningIcon`. `cn` merges it over the default fill.

## What you provide

- `children`: one or two words. Icons go inside, marked `data-icon="inline-start"` or `"inline-end"` so the padding tightens; icons are forced to `size-3`.
- `render` (Base UI) to render as another element, such as a link.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `default` `secondary` `destructive` `outline` `ghost` `link` | `default` |
| `render` | element or function | `<span>` |

All other props pass to the `<span>`. Fixed styles: `h-5` (20px), `rounded-3xl`, `px-2`, `text-xs font-medium`, `whitespace-nowrap`.

## Do and don't

- Do keep badge text short; the badge does not wrap.
- Do use `destructive` only for real loss states, not for emphasis.
- Don't use a badge as a button; hover styles on `default`, `secondary`, `destructive` and `outline` only apply when it renders as an `<a>`.

Source: `packages/ui/src/components/badge.tsx`. Also exports `badgeVariants`.
