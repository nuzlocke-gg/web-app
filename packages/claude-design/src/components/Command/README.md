# Command

A searchable list of items and actions with keyboard navigation, shown inline or in a dialog as a command palette.

## When to use

- A quick-jump palette: go to a route, open the graveyard, add an encounter.
- Searching a long list where the user knows the name: Pokémon species, routes.
- Use `CommandDialog` for a palette opened by a shortcut; use `Command` inline in a page or popover.

## What you provide

- `CommandInput` with a `placeholder` that says what can be searched.
- `CommandList` with `CommandGroup`s (each with a `heading`), `CommandItem`s and a `CommandEmpty` message.
- `CommandItem` children: an optional icon, a label, and an optional `CommandShortcut`.
- For `CommandDialog`: a `title` and `description` for screen readers (shown `sr-only`).

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` / `defaultValue` / `onValueChange` | the highlighted item value (cmdk) | — |
| `shouldFilter` | boolean | `true` |
| `filter` | `(value, search, keywords) => number` | cmdk default |
| `loop` | boolean — wrap arrow-key navigation | `false` |
| `CommandItem` `value` / `keywords` / `disabled` / `onSelect` | cmdk item props | — |
| `CommandDialog` `title` | string | `"Command Palette"` |
| `CommandDialog` `description` | string | `"Search for a command to run..."` |
| `CommandDialog` `showCloseButton` | boolean | `false` |
| `CommandDialog` `open` / `defaultOpen` / `onOpenChange` | Dialog props | — |

Built on `cmdk`, not Base UI.

## Parts

- `CommandDialog` — Command inside a Dialog, placed at `top-1/3` with no padding.
- `CommandInput` — search field in an `InputGroup` (`h-9`, `bg-input/50`) with a search icon.
- `CommandList` — the scrolling list, `max-h-72`.
- `CommandEmpty` — shown when nothing matches.
- `CommandGroup` — a section with a `heading` (`text-xs text-muted-foreground`).
- `CommandItem` — a row, `rounded-2xl`; selected rows use `bg-muted`. Shows a check when `data-checked="true"`.
- `CommandShortcut` — a right-aligned shortcut hint.
- `CommandSeparator` — a 1px line between groups.

## Do and don't

- Do write a `CommandEmpty` message such as "No results found."
- Do pass a sentence-case `title` to `CommandDialog`; the default "Command Palette" is title case.
- Don't put Command in a fixed-height parent without room for `max-h-72` (288px) of list.

Source: `packages/ui/src/components/command.tsx`. The root is `rounded-4xl bg-popover p-1` with no border; add a ring when it sits on `background`.
