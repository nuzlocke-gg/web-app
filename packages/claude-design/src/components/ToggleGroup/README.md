# ToggleGroup

A row of Toggles where one (or several, with `multiple`) is selected — the segmented control for short choices like Caught/Missed or Party/Box.

## When to use

- Choose one of two to five short options that sets a value or a filter: Caught/Missed, Wild/Gift/Trade, Party/Box, List/Grid.
- `multiple` for independent options shown together, such as rule filters.
- For options that switch between panels of content, use Tabs. For long lists, use Select or RadioGroup.

## What you provide

- `ToggleGroupItem` children, each with a unique `value` and a short label (or an icon plus `aria-label`).
- `aria-label` on the group that names the choice ("Encounter result").
- `value` and `onValueChange` (controlled), or `defaultValue`. Values are always arrays, also for a single choice: `defaultValue={["caught"]}`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `default` `outline` — passed to every item | item's own (`default`) |
| `size` | `default` `sm` `lg` — passed to every item | item's own (`default`) |
| `spacing` | gap in spacing steps; `0` joins the items into one pill with shared edges | `2` |
| `orientation` | `horizontal` `vertical` | `horizontal` |
| `value` / `defaultValue` | `string[]` | — |
| `onValueChange` | `(value: string[], details) => void` | — |
| `multiple` | boolean — allow several pressed items | `false` |
| `disabled` | boolean | `false` |
| `loopFocus` | boolean — arrow keys wrap | `true` |

## Parts

- `ToggleGroupItem` — a Toggle (`value`, `disabled`, `variant`, `size`); the group's `variant` and `size` win when set.

## Do and don't

- Do use `variant="outline"` with `spacing={0}` for a segmented control: one `rounded-3xl` pill with `input` borders and a `muted` fill on the selected item.
- Do keep every option visible; if labels do not fit in one row, use Select.
- Don't leave a single-choice group empty if the value is required; with `multiple` off, pressing the selected item again clears it, so keep it controlled and ignore an empty array.

Source: `packages/ui/src/components/toggle-group.tsx` (added with the shadcn CLI). Its `data-[state=on]:bg-muted` style never applies (Base UI sets `aria-pressed`, not `data-state`); the selected fill comes from Toggle's `aria-pressed:bg-muted`.
