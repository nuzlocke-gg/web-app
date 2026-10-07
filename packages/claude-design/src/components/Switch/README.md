# Switch

A pill-shaped on/off toggle for settings that take effect at once, filled with `primary` when on.

## When to use

- A setting that applies immediately: show fainted Pokémon, nicknames required.
- Use `Checkbox` when the choice only applies after a form is saved.

## What you provide

- A label: wrap the switch in a `Label`, or pair it with a `FieldLabel` in a horizontal `Field`.
- `checked` + `onCheckedChange`, or `defaultChecked`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `size` | `default` (20 × 44px, thumb 16 × 24px) `sm` (16 × 28px, thumb 12 × 16px) | `default` |
| `checked` | boolean (controlled) | — |
| `defaultChecked` | boolean | `false` |
| `onCheckedChange` | `(checked: boolean, eventDetails) => void` | — |
| `disabled` | boolean — 50% opacity | `false` |
| `readOnly` / `required` | boolean | `false` |
| `name` / `value` | string — for form submission | — |

All other props pass to the Base UI `Switch.Root`. Off is `bg-input/90`; on is `bg-primary` with a `border-primary` edge.

## Do and don't

- Do label the setting, not the state: "Show fainted Pokémon", not "On".
- Do use `size="sm"` in dense rows and tables.
- Don't use a switch inside a form that needs a Save button; use `Checkbox`.

Source: `packages/ui/src/components/switch.tsx`.
