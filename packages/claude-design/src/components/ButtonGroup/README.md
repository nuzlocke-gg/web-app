# ButtonGroup

Joins buttons, inputs and selects into one connected pill, with shared edges and only the outer corners rounded.

## When to use

- A set of related actions: Export / Share, or Previous / Next.
- A split button: main action plus a menu caret, divided by `ButtonGroupSeparator`.
- An input with a fixed prefix (`ButtonGroupText`) and a submit button, such as a level cap.

## What you provide

- `children`: `Button`, `Input`, `SelectTrigger`, `InputGroup` or nested `ButtonGroup` elements. Nested groups get a `gap-2` between them.
- An `aria-label` when the group's purpose is not clear from its buttons. The root already has `role="group"`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `orientation` | `horizontal` `vertical` | `horizontal` |

All other props pass to the root `<div>`.

## Parts

- `ButtonGroupText` — a static label cell: `rounded-4xl`, `border`, `bg-muted`, `px-2.5`, `text-sm font-medium`. Takes `render` (Base UI) to render as another element, such as a `Label`.
- `ButtonGroupSeparator` — a 1px `bg-input` divider between items. `orientation` defaults to `vertical`.

## Do and don't

- Do use the same `variant` and `size` for every button in a group.
- Don't show a selected option with a different button variant. Buttons run actions; for a choice that stays selected (Party / Box), use ToggleGroup.
- Do put a `ButtonGroupSeparator` between `secondary` or `default` buttons; `outline` buttons already show their border.
- Don't set radius on the children; the group sets `rounded-4xl` on the outer ends and removes it inside.

Source: `packages/ui/src/components/button-group.tsx`. Also exports `buttonGroupVariants`.
