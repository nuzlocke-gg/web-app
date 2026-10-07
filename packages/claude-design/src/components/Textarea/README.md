# Textarea

A multi-line text field that grows with its content, starting at 64px tall with `rounded-2xl` corners.

## When to use

- Free text longer than one line: run notes, house rules, how a Pokémon fainted.
- Use `Input` for one line. Use `InputGroupTextarea` when the field needs a footer bar.

## What you provide

- A visible `Label` with `htmlFor`, or an `aria-label`.
- `placeholder`, `value` / `defaultValue` and other `<textarea>` props.
- `aria-invalid` to show the error state.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `disabled` | boolean — 50% opacity, not-allowed cursor | `false` |
| `aria-invalid` | boolean — `destructive` border and 3px ring | — |
| `rows` | number (has no effect on height: the source uses `field-sizing-content`) | — |

All other props pass to the native `<textarea>`. Fixed styles: `min-h-16` (64px), `px-3 py-3`, `bg-input/50`, `resize-none`.

## Do and don't

- Do let it grow; don't set a fixed `h-*` unless the space is truly fixed.
- Do use `aria-invalid` for errors so the border turns `destructive`.
- Don't add `resize` back; the field sizes itself with `field-sizing-content`.

Source: `packages/ui/src/components/textarea.tsx`.
