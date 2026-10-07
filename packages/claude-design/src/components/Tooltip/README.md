# Tooltip

A short dark label that shows on hover or focus to name an icon button or show its keyboard shortcut.

## When to use

- To name icon-only buttons: Save team, Release, Edit.
- To show a shortcut next to the label with `Kbd`.
- Not for important or interactive content; use Popover.

## What you provide

- `TooltipTrigger` with `render={<Button … />}`. The button still needs its own `aria-label`.
- `TooltipContent` with a short label, optionally followed by a `Kbd`.
- Optional `TooltipProvider` around a group of tooltips to share the delay.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `open` / `defaultOpen` | boolean | `false` |
| `onOpenChange` | `(open, details) => void` | — |
| `disabled` | boolean | `false` |
| `TooltipContent` `side` | `top` `right` `bottom` `left` `inline-start` `inline-end` | `top` |
| `TooltipContent` `align` | `start` `center` `end` | `center` |
| `TooltipContent` `sideOffset` / `alignOffset` | number (px) | `4` / `0` |
| `TooltipProvider` `delay` | ms before open | `0` |
| `TooltipProvider` `closeDelay` | ms before close | Base UI default |

## Parts

- `TooltipProvider` — shares open and close delays across tooltips.
- `TooltipTrigger` — the element that shows the tooltip.
- `TooltipContent` — the label: `rounded-xl`, `bg-foreground`, `text-background`, `text-xs`, `max-w-xs`, with an arrow. Renders portal and positioner.

## Do and don't

- Do keep the label to a few words in sentence case.
- Do put a `Kbd` inside for shortcuts; it gets `bg-background/20` styling there.
- Don't put links or buttons in a tooltip.

Source: `packages/ui/src/components/tooltip.tsx`.
