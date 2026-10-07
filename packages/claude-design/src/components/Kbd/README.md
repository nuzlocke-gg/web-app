# Kbd

A small key cap that shows a keyboard key or shortcut in text, menus and tooltips.

## When to use

- To show a shortcut in help text, a Tooltip or a menu.
- To name a key in instructions: "Press Esc to close."
- For shortcuts in DropdownMenu or Command rows, prefer their own `Shortcut` parts.

## What you provide

- `children`: the key text (`⌘`, `K`, `Esc`) or a small icon.
- `KbdGroup` around keys that are pressed together.

## Props

`Kbd` takes all `<kbd>` attributes. It has no variants or sizes: `h-5.5`, `min-w-5.5`, `rounded-lg`, `px-1.5`, `text-xs font-medium`, `bg-muted`, `text-muted-foreground`. Icons are `size-3`.

Inside an `InputGroup` it uses `bg-input`; inside `TooltipContent` it uses `bg-background/20` and `text-background`.

## Parts

- `Kbd` — one key.
- `KbdGroup` — an inline row of keys with `gap-1`.

## Do and don't

- Do use one `Kbd` per key and group them with `KbdGroup`.
- Do use symbols for Mac modifiers (`⌘`, `⇧`) and words for named keys (`Esc`, `Enter`).
- Don't use `Kbd` for buttons; it has no pointer events.

Source: `packages/ui/src/components/kbd.tsx`. `KbdGroup` is typed as a `div` but renders a `<kbd>`.
