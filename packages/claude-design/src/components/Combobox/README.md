# Combobox

A text field that filters a list as you type, then picks one value or several (shown as chips).

## When to use

- Picking from a long list where typing is faster than scrolling: Pokémon, routes, moves.
- `multiple` with `ComboboxChips` to pick several, such as banned Pokémon.
- Use `Select` for short fixed lists.

## What you provide

- `items` on the root (strings or objects). For objects, set `itemToStringLabel` or use `{ label, value }`.
- `ComboboxInput` (single) or `ComboboxChips` + `ComboboxChipsInput` (multiple), with a `placeholder` and a label.
- `ComboboxContent` holding `ComboboxEmpty` and a `ComboboxList` whose child is a function `(item) => <ComboboxItem key value>`.
- For chips: `const anchor = useComboboxAnchor()`, put `ref={anchor}` on `ComboboxChips` and `anchor={anchor}` on `ComboboxContent`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `items` | array of items or groups | — |
| `value` / `defaultValue` | chosen item (array when `multiple`) | — |
| `onValueChange` | `(value, eventDetails) => void` | — |
| `inputValue` / `defaultInputValue` / `onInputValueChange` | the typed text | — |
| `open` / `defaultOpen` / `onOpenChange` | boolean | `false` |
| `multiple` | boolean | `false` |
| `filter` | `(item, query) => boolean`, or `null` to turn filtering off | built-in match |
| `autoHighlight` | boolean | `false` |
| `modal` | boolean | `false` |
| `disabled` / `required` / `readOnly` | boolean | `false` |

`Combobox` is the Base UI `Combobox.Root`.

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `ComboboxInput` | `showTrigger` | boolean — caret button | `true` |
| `ComboboxInput` | `showClear` | boolean — clear button (hides the caret when shown) | `false` |
| `ComboboxInput` | `disabled` | boolean | `false` |
| `ComboboxContent` | `side` / `align` | Base UI positioner values | `bottom` / `start` |
| `ComboboxContent` | `sideOffset` / `alignOffset` | number | `6` / `0` |
| `ComboboxContent` | `anchor` | element ref (for chips) | the input |
| `ComboboxChip` | `showRemove` | boolean | `true` |

## Parts

- `ComboboxInput` — an `InputGroup` (36px, `rounded-4xl`) with the input, caret and clear buttons.
- `ComboboxContent` — the portalled popup: `rounded-3xl`, `bg-popover/70` with `backdrop-blur-2xl`.
- `ComboboxList` — the scrolling list, at most 252px tall, `p-1.5`.
- `ComboboxItem` — one option, `rounded-2xl`, check icon when chosen.
- `ComboboxEmpty` — text shown only when nothing matches.
- `ComboboxGroup` / `ComboboxLabel` / `ComboboxCollection` — group items under a `text-xs` `muted-foreground` heading.
- `ComboboxSeparator` — a 1px line.
- `ComboboxChips` / `ComboboxChip` / `ComboboxChipsInput` — the multiple-value field; chips are 22px, `rounded-3xl`, `bg-input`.
- `ComboboxTrigger` / `ComboboxClear` / `ComboboxValue` — lower-level parts for custom layouts.
- `useComboboxAnchor()` — returns a ref to anchor the popup to the chips field.

## Do and don't

- Do always add `ComboboxEmpty` with a short message: "No Pokémon found."
- Do use `showClear` when clearing the value is common.
- Don't use a combobox for fewer than about 8 options; use `Select` or `RadioGroup`.

Source: `packages/ui/src/components/combobox.tsx`.
