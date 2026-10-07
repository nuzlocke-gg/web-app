# NavigationMenu

A horizontal site menu whose triggers open a shared popup panel of links, built on Base UI Navigation Menu.

## When to use

- Top-level app or site navigation with grouped links: Runs, Pokédex, Rules.
- Not for actions on a page; use DropdownMenu for that.

## What you provide

- `NavigationMenu` wrapping one `NavigationMenuList` of `NavigationMenuItem`s. The root adds its own positioner and viewport, so you do not render them.
- For a panel: an item with a `value`, a `NavigationMenuTrigger` (label; a caret is added) and a `NavigationMenuContent` with links. Give the content a width (for example `w-[420px]`).
- For a plain link: an item with a `NavigationMenuLink` styled with `navigationMenuTriggerStyle()`.
- `NavigationMenuLink` takes `href`; use `render` for a router link and `active` for the current page.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `align` | `start` `center` `end` (popup alignment to the trigger) | `start` |
| `value` / `defaultValue` | the open item's `value`, or `null` | `null` |
| `onValueChange` | `(value, details) => void` | — |
| `orientation` | `horizontal` `vertical` | `horizontal` |
| `delay` / `closeDelay` | ms before open / close on hover | `50` / `50` |

`NavigationMenuLink` also takes `active` (boolean) and `closeOnClick` (boolean).

## Parts

- `NavigationMenuList` — the row of items.
- `NavigationMenuItem` — one entry; set `value` when it has content.
- `NavigationMenuTrigger` — 36px pill (`rounded-3xl`) that opens its content; `muted` when open.
- `NavigationMenuContent` — the panel body shown in the popup (padding 10px).
- `NavigationMenuLink` — a link row (`rounded-2xl` inside content), `muted` on hover and when `active`.
- `NavigationMenuIndicator` — optional arrow under the active trigger.
- `NavigationMenuPositioner` — rendered by the root; places the popup 8px below the trigger.
- `navigationMenuTriggerStyle` — class names for a link that looks like a trigger.

## Do and don't

- Do keep three to six top-level items with short labels.
- Do put a title and a one-line `muted-foreground` description in each content link.
- Don't nest a NavigationMenu in a panel; the popup is `rounded-3xl` `popover` with `shadow-lg` and one level only.

Source: `packages/ui/src/components/navigation-menu.tsx`.
