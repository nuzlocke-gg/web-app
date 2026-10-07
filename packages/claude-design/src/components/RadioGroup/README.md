# RadioGroup

A set of 16px round options where exactly one can be on; the chosen one fills with `primary`.

## When to use

- One choice from 2 to 5 visible options, such as run difficulty.
- Use `Select` for longer lists and `Checkbox` when more than one can be on.

## What you provide

- One `RadioGroupItem` per option, each with a unique `value` and a label (wrap it in a `Label`, or use `id` / `htmlFor`).
- A group name: `aria-labelledby` pointing at a heading, or a `FieldSet` with a `FieldLegend`.
- `value` + `onValueChange`, or `defaultValue`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` | the chosen item's value (controlled) | — |
| `defaultValue` | the initially chosen value | — |
| `onValueChange` | `(value, eventDetails) => void` | — |
| `disabled` / `readOnly` / `required` | boolean | `false` |
| `name` | string — for form submission | — |

The root is a Base UI `RadioGroup` laid out as `grid w-full gap-3`.

## Parts

- `RadioGroupItem` — one option. Needs `value`; takes `disabled`. `size-4` circle on `bg-input/90`; when checked, `bg-primary` with a `size-2` `primary-foreground` dot (`size-2.5` in dark mode).

## Do and don't

- Do set a `defaultValue` so one option is on from the start.
- Do keep option labels parallel and short; add detail in brackets or a `FieldDescription`.
- Don't use a radio group for a single on/off option; use `Checkbox` or `Switch`.

Source: `packages/ui/src/components/radio-group.tsx`.
