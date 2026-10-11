# Collapsible

One region that a trigger shows and hides, built on Base UI Collapsible. It adds no styling of its own.

## When to use

- A list or detail that stays one tap away but out of the way, such as the warnings list in the tracking screen's dock.
- Not for several sections read one at a time; use Accordion.

## What you provide

- A `Collapsible` root, controlled with `open` and `onOpenChange` or uncontrolled with `defaultOpen`.
- A `CollapsibleTrigger`, usually a `Button` through `render`. It gets `aria-expanded` and `aria-controls`.
- A `CollapsibleContent` with the region.

## Props

| Prop                   | Values                    | Default |
| ---------------------- | ------------------------- | ------- |
| `open` / `defaultOpen` | boolean                   | `false` |
| `onOpenChange`         | `(open, details) => void` | —       |
| `disabled`             | boolean                   | `false` |

`CollapsibleContent` takes `keepMounted` and `hiddenUntilFound` to keep closed content in the DOM.

## Parts

- `Collapsible` — the root; its state is on `data-open` and `data-closed`.
- `CollapsibleTrigger` — the button that toggles it.
- `CollapsibleContent` — the region it shows and hides.

## Do and don't

- Do label the trigger with what it shows: "2 warnings".
- Do put the trigger where the player expects the region to open.
- Don't hide content that every player needs to read.

Source: `packages/ui/src/components/collapsible.tsx`.
