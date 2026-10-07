# InputGroup

A text field with icons, text or buttons inside its edge, built from an input or textarea plus addons.

## When to use

- A search field with a leading icon or a result count.
- A field with an inline action: clear, copy, show password.
- A textarea with a footer bar, such as a character count and a save button (`block-end`).

## What you provide

- One control: `InputGroupInput` or `InputGroupTextarea`, with a label or `aria-label`.
- One or more `InputGroupAddon` elements. Order in the markup does not matter; `align` places them.
- An `aria-label` on every icon-only `InputGroupButton`.

## Props

`InputGroup` takes `<div>` props only. Its shape follows its content: `h-9` and `rounded-4xl` with an input, `rounded-2xl` with a textarea, `rounded-3xl` and `flex-col` with a `block-start` or `block-end` addon.

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `InputGroupAddon` | `align` | `inline-start` `inline-end` `block-start` `block-end` | `inline-start` |
| `InputGroupButton` | `size` | `xs` (24px) `sm` `icon-xs` (24px) `icon-sm` (32px) | `xs` |
| `InputGroupButton` | `variant` | any `Button` variant | `ghost` |
| `InputGroupButton` | `type` | `button` `submit` `reset` | `button` |

## Parts

- `InputGroupInput` — an `Input` with no fill, border or ring of its own.
- `InputGroupTextarea` — a `Textarea` with no fill, border or ring; `py-2.5`.
- `InputGroupAddon` — holds icons, text or buttons. A click on it focuses the input (not on a button).
- `InputGroupButton` — a compact `Button` for inline actions.
- `InputGroupText` — `text-sm` `muted-foreground` text in an addon.

## Do and don't

- Do set `aria-invalid` on the control; the whole group gets the `destructive` border and ring.
- Do use `ghost` buttons inline; keep one `default` button at most, in a `block-end` footer.
- Don't nest an `Input` directly; use `InputGroupInput` so the group draws the focus ring with `ring`.

Source: `packages/ui/src/components/input-group.tsx`.
