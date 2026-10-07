# Checkbox

A 16px square toggle with `rounded-[5px]` corners that fills with `primary` and shows a check when on.

## When to use

- An on/off choice that applies when the form is saved, such as rule clauses.
- A list where more than one option can be on. Use `RadioGroup` for one-of-many and `Switch` for a setting that applies at once.

## What you provide

- A label: wrap the checkbox in a `Label`, or pair it with a `FieldLabel` in a horizontal `Field` using `id` / `htmlFor`.
- `checked` + `onCheckedChange`, or `defaultChecked`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `checked` | boolean (controlled) | — |
| `defaultChecked` | boolean | `false` |
| `onCheckedChange` | `(checked: boolean, eventDetails) => void` | — |
| `indeterminate` | boolean | `false` |
| `disabled` | boolean — 50% opacity | `false` |
| `readOnly` / `required` | boolean | `false` |
| `name` / `value` | string — for form submission | — |
| `aria-invalid` | boolean — `destructive` border and ring | — |

All other props pass to the Base UI `Checkbox.Root` (a `<span role="checkbox">` with a hidden input). The hit area extends 12px to the sides and 8px above and below.

## Do and don't

- Do label every checkbox; the box alone has no name.
- Do write labels as the "on" state: "Dupes clause", not "Disable dupes clause".
- Don't rely on `indeterminate` for a distinct look; the source shows the same check icon and has no `indeterminate` style.

Source: `packages/ui/src/components/checkbox.tsx`.
