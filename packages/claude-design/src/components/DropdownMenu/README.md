# DropdownMenu

A menu of actions that opens from a button, with labels, shortcuts, checkbox and radio items, and submenus.

## When to use

- A list of actions for one item: rename, move to box, release a Pokémon.
- Options that change a view: checkbox and radio items.
- For a searchable list, use Command. For a form value, use Select.

## What you provide

- `DropdownMenuTrigger` with `render={<Button … />}`; give icon-only triggers an `aria-label`.
- `DropdownMenuItem` children: an optional icon, then a short verb label.
- `DropdownMenuLabel` must sit inside a `DropdownMenuGroup`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `open` / `defaultOpen` | boolean | `false` |
| `onOpenChange` | `(open, details) => void` | — |
| `modal` | boolean | `true` |
| `disabled` | boolean | `false` |
| `DropdownMenuContent` `side` | `top` `right` `bottom` `left` `inline-start` `inline-end` | `bottom` |
| `DropdownMenuContent` `align` | `start` `center` `end` | `start` |
| `DropdownMenuContent` `sideOffset` / `alignOffset` | number (px) | `4` / `0` |
| `DropdownMenuItem` `variant` | `default` `destructive` | `default` |
| `inset` (Item, Label, CheckboxItem, RadioItem, SubTrigger) | boolean — indents to line up with icon items | `false` |

## Parts

- `DropdownMenuTrigger` — opens the menu.
- `DropdownMenuContent` — the panel: `min-w-48`, at least the trigger width, `rounded-3xl`, `p-1.5`, translucent `bg-popover/70` with backdrop blur.
- `DropdownMenuGroup` — groups items; needed around a label.
- `DropdownMenuLabel` — `text-xs text-muted-foreground` heading.
- `DropdownMenuItem` — an action, `rounded-2xl`, `px-3 py-2`.
- `DropdownMenuCheckboxItem` — toggles; check mark on the right.
- `DropdownMenuRadioGroup`, `DropdownMenuRadioItem` — one choice from a set.
- `DropdownMenuSeparator` — a 1px line.
- `DropdownMenuShortcut` — a right-aligned shortcut hint.
- `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` — a nested menu that opens to the right.
- `DropdownMenuPortal` — the portal; `DropdownMenuContent` already uses it.

## Do and don't

- Do put the `destructive` item last, after a separator.
- Do keep labels short and start them with a verb.
- Don't nest more than one submenu level.

Source: `packages/ui/src/components/dropdown-menu.tsx`. Inside the content, highlighted items use `bg-foreground/10`, and `destructive` items show `accent-foreground` text (source value, kept).
