# Field

A set of layout parts that put a label, control, help text and error together in one accessible form row.

## When to use

- Any form: new run setup, encounter details, rule settings.
- `orientation="horizontal"` for a checkbox, radio or switch next to its label.
- `FieldSet` with `FieldLegend` for a group of related choices, such as run rules.

## What you provide

- A `FieldLabel` with `htmlFor` that matches the control's `id`.
- The control: `Input`, `Textarea`, `SelectTrigger`, `Checkbox`, `Switch` or `RadioGroup`.
- Optional `FieldDescription` and `FieldError`.
- `data-invalid="true"` on the `Field` and `aria-invalid` on the control for an error; `data-disabled="true"` on the `Field` to dim the label.

## Props

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `Field` | `orientation` | `vertical` `horizontal` `responsive` | `vertical` |
| `FieldLegend` | `variant` | `legend` (`text-base`) `label` (`text-sm`) | `legend` |
| `FieldError` | `errors` | `Array<{ message?: string } \| undefined>` — duplicates removed, several shown as a list | — |
| `FieldSeparator` | `children` | optional text shown on the line | — |

`responsive` stacks the field and switches to a row when the parent `FieldGroup` is `@md` wide or more. `Field` has `role="group"` and `gap-3`.

## Parts

- `FieldSet` — a `<fieldset>`, `flex-col gap-6`.
- `FieldLegend` — the `<legend>` for a `FieldSet`.
- `FieldGroup` — stacks fields with `gap-7`; also the container for `responsive` fields.
- `FieldContent` — stacks a label and description next to a horizontal control.
- `FieldLabel` — a `Label` for the control. Wrap a whole `Field` in it to make a selectable card (`rounded-2xl border`).
- `FieldTitle` — label-styled text that is not a `<label>`.
- `FieldDescription` — `text-sm` `muted-foreground` help text.
- `FieldError` — `text-sm` `destructive` text with `role="alert"`; renders nothing when empty.
- `FieldSeparator` — a horizontal line, with optional centered text.

## Do and don't

- Do set both `data-invalid="true"` on `Field` and `aria-invalid` on the control; the first colors the label `destructive`, the second the control.
- Do say how to fix the error in `FieldError`: "Level cap must be 100 or less."
- Don't put the description in the placeholder; use `FieldDescription` so it stays visible.

Source: `packages/ui/src/components/field.tsx`.
