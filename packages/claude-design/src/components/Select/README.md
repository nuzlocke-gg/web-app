# Select

A pick-one menu: a `rounded-3xl` trigger shows the chosen value and opens a frosted list of options.

## When to use

- One choice from a fixed list of about 5 to 15 options: starter, game version, region.
- Use `RadioGroup` when all options should stay visible, and `Combobox` when people need to type to filter.

## What you provide

- `SelectTrigger` with a `SelectValue` inside it, plus a label (`FieldLabel` or `aria-label`).
- `SelectContent` with `SelectItem` children, each with a `value` and a text label.
- `items` on the root (`{ label, value }[]` or a record) so `SelectValue` shows the label, not the raw value.
- `placeholder` on `SelectValue` for the empty state.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` / `defaultValue` | the chosen value | — |
| `onValueChange` | `(value, eventDetails) => void` | — |
| `open` / `defaultOpen` | boolean | `false` |
| `onOpenChange` | `(open, eventDetails) => void` | — |
| `items` | `{ label, value }[]`, record or groups | — |
| `multiple` | boolean | `false` |
| `modal` | boolean — locks page scroll while open | `true` |
| `disabled` / `required` / `readOnly` | boolean | `false` |
| `name` | string — for form submission | — |

`Select` is the Base UI `Select.Root`.

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `SelectTrigger` | `size` | `default` (36px) `sm` (32px) | `default` |
| `SelectContent` | `side` | `top` `bottom` `left` `right` `inline-start` `inline-end` | `bottom` |
| `SelectContent` | `align` | `start` `center` `end` | `center` |
| `SelectContent` | `sideOffset` / `alignOffset` | number | `4` / `0` |
| `SelectContent` | `alignItemWithTrigger` | boolean — list opens over the trigger with the chosen item on top of it | `true` |

## Parts

- `SelectTrigger` — the button; `bg-input/50`, caret icon on the right.
- `SelectValue` — the chosen label or the `placeholder` (in `muted-foreground`).
- `SelectContent` — the portalled popup: `rounded-3xl`, `bg-popover/70` with `backdrop-blur-2xl`, at least `min-w-36` and the trigger's width.
- `SelectGroup` — groups items, `p-1.5`.
- `SelectLabel` — a `text-xs` `muted-foreground` group heading.
- `SelectItem` — one option, `rounded-2xl`, check icon on the right when chosen.
- `SelectSeparator` — a 1px `bg-border` line between groups.
- `SelectScrollUpButton` / `SelectScrollDownButton` — arrows shown when the list overflows; already inside `SelectContent`.

## Do and don't

- Do pass `items` to the root so the trigger shows "Mudkip", not "mudkip".
- Do give the trigger a fixed width (`w-48`) so it doesn't jump when the value changes.
- Don't put actions in a select; use `DropdownMenu`.

Source: `packages/ui/src/components/select.tsx`.
