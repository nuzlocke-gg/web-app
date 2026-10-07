# Accordion

A bordered `rounded-2xl` stack of sections that expand and collapse one at a time (or many with `multiple`), built on Base UI Accordion.

## When to use

- Long reference content where the player reads one part at a time: rules, FAQs, route notes.
- Not for primary content that everyone needs; show it directly.

## What you provide

- One `AccordionItem` per section, each with a `value`.
- An `AccordionTrigger` with a short heading (a caret icon is added) and an `AccordionContent` with the body.
- `defaultValue` as an array of open item values, for example `["first"]`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` / `defaultValue` | array of item values | `[]` |
| `onValueChange` | `(value, details) => void` | — |
| `multiple` | boolean — allow more than one open item | `false` |
| `disabled` | boolean | `false` |
| `orientation` | `vertical` `horizontal` | `vertical` |
| `hiddenUntilFound` / `keepMounted` | boolean — keep closed content in the DOM | `false` |

`AccordionItem` takes `value`, `disabled` and `onOpenChange`.

## Parts

- `AccordionItem` — one section; open items get a `muted/50` background and items are split by a border.
- `AccordionTrigger` — full-width header button, 16px padding, underline on hover, caret in `muted-foreground`.
- `AccordionContent` — the animated panel, 16px side padding.

## Do and don't

- Do write triggers as short noun phrases: "Fainting rule".
- Do use `multiple` when sections are read side by side.
- Don't nest accordions.

Source: `packages/ui/src/components/accordion.tsx`.
