# Label

A short `text-sm font-medium` caption for a form control, laid out as a row so it can hold the control too.

## When to use

- Above or beside an `Input`, `Textarea` or `SelectTrigger`, linked with `htmlFor`.
- Wrapped around a `Checkbox`, `RadioGroupItem` or `Switch` so the whole row is clickable.
- Inside a `Field`, use `FieldLabel` instead; it is a `Label` with field styles.

## What you provide

- `children`: the label text, sentence case, no trailing colon.
- `htmlFor` with the control's `id`, or the control itself as a child.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `htmlFor` | the `id` of the control | — |

All other props pass to the native `<label>`. Styles: `flex items-center gap-2`, `text-sm leading-none font-medium`, `select-none`.

## Do and don't

- Do place a disabled control before its label (as a `peer`) or inside a `data-disabled="true"` group; the label then dims to 50%.
- Do keep labels to a few words; put help text in a `FieldDescription`.
- Don't use a `Label` as a heading for a group of controls; use `FieldLegend` in a `FieldSet`.

Source: `packages/ui/src/components/label.tsx`.
