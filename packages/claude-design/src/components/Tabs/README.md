# Tabs

Switches between panels of related content in one view, with a pill or underline tab list, built on Base UI Tabs.

## When to use

- Views of the same run that do not need to be seen at once: Team, Box, Graveyard.
- `default` list (pill on `muted`) for compact switchers; `line` list (underline) for page-level sections.
- Not for navigation between pages; use NavigationMenu or links.
- Not for picking a value or a filter that does not change panels (Caught / Missed, Wild / Gift / Trade); use ToggleGroup.

## What you provide

- `Tabs` with `defaultValue` (or `value` + `onValueChange`).
- One `TabsList` with a `TabsTrigger` per tab, each with a `value` and a short label. Icons go inside with `data-icon="inline-start"` or `"inline-end"`.
- One `TabsContent` per tab with the same `value`.

## Props

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `Tabs` | `value` / `defaultValue` | tab value | `0` |
| `Tabs` | `onValueChange` | `(value, details) => void` | — |
| `Tabs` | `orientation` | `horizontal` `vertical` | `horizontal` |
| `TabsList` | `variant` | `default` `line` | `default` |
| `TabsTrigger` | `value` | any (required) | — |
| `TabsTrigger` | `disabled` | boolean — 50% opacity | `false` |

## Parts

- `TabsList` — 36px high in horizontal mode, `rounded-full`, `p-1`; `rounded-2xl` when vertical.
- `TabsTrigger` — one tab; active gets `background` (pill) or a 2px `foreground` underline (`line`).
- `TabsContent` — the panel for one value, `text-sm`.
- `tabsListVariants` — class names for the list look.

## Do and don't

- Do keep labels to one or two words, sentence case.
- Do use `vertical` for settings-style side tabs; triggers then go full width and `rounded-2xl`.
- Don't mix `default` and `line` lists in the same view.

Source: `packages/ui/src/components/tabs.tsx`.
