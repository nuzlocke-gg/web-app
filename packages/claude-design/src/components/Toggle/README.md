# Toggle

A button that stays pressed or unpressed, for one on/off view option such as "Show fainted"; pressed shows a `muted` fill.

## When to use

- One view or filter option that is on or off and applies at once: Show fainted, Shiny only.
- For a setting that saves (Nicknames required), use Switch. For one choice among several options, use ToggleGroup.

## What you provide

- `children`: a short label, or an icon plus `aria-label`. Mark icons beside text `data-icon="inline-start"` or `"inline-end"`.
- `pressed` and `onPressedChange` (controlled), or `defaultPressed`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `default` (no fill) `outline` (`input` border) | `default` |
| `size` | `default` (36px) `sm` (32px) `lg` (40px); `min-w` equals the height | `default` |
| `pressed` / `defaultPressed` | boolean | `false` |
| `onPressedChange` | `(pressed, details) => void` | — |
| `value` | string, used inside a ToggleGroup | — |
| `disabled` | boolean — 50% opacity | `false` |

Base UI `Toggle` renders a `<button>` with `aria-pressed`. Shape: `rounded-3xl`, `text-sm font-medium`.

## Do and don't

- Do keep the label the same in both states; `aria-pressed` and the `muted` fill show the state.
- Don't rely on the fill alone where it matters: `muted` on `background` is a soft step (source value). Use `outline` so the control has an edge.
- Don't use a Toggle to submit or to run an action; use Button.

Source: `packages/ui/src/components/toggle.tsx` (added with the shadcn CLI). Also exports `toggleVariants`.
