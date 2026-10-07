# Input

A single-line text field on a soft `input` fill, 36px tall with a `rounded-3xl` shape.

## When to use

- Short free text: a nickname, a run name, a level, a search query.
- Use `Textarea` for more than one line, and `InputGroup` when the field needs an icon, text or button inside it.

## What you provide

- A visible `Label` with `htmlFor`, or an `aria-label` when there is no visible label.
- `type`, `placeholder`, `value` / `defaultValue` and other `<input>` props.
- `aria-invalid` to show the error state.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `type` | any `<input>` type | `text` (browser default) |
| `disabled` | boolean — 50% opacity, no pointer events | `false` |
| `aria-invalid` | boolean — `destructive` border and 3px ring | — |

All other props pass to the Base UI `Input` (an `<input>`). Size is fixed: `h-9` (36px), `px-3`, `text-base` on small screens and `md:text-sm` above.

## Do and don't

- Do give every input a label; a `placeholder` is not a label.
- Do use `aria-invalid` for errors so the border turns `destructive`; don't add a red class.
- Don't change the height or radius with `className`; put the input in an `InputGroup` or `ButtonGroup` instead.

Source: `packages/ui/src/components/input.tsx`.
