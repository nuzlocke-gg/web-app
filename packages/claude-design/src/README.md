One purple accent on quiet zinc neutrals, soft pill shapes, and Geist type. Built on shadcn/ui ("base-luma" style) with Base UI primitives and Tailwind v4. Light and dark themes follow the system setting; press `d` to toggle.

## Content fundamentals

- Write short, plain sentences. Use sentence case for every label, title and button ("Start new run", not "Start New Run").
- Buttons say what happens: a verb plus an object ("Release Pokémon", "Save team"). Avoid "OK" and "Submit".
- Address the player as "you". Do not use emoji in UI copy.
- Errors say what went wrong and what to do next, in `destructive` text under the field.

## Color

- Build every surface from the neutrals: `background` for the page, `card` for cards and alerts, `popover` for floating panels, `muted` for hover fills and skeletons.
- Set text in `foreground`. Use `muted-foreground` for descriptions, placeholders and helper text on `background` or `card`.
- `primary` is the only brand color. Spend it on the one main action per view, on links, and on checked controls (Checkbox, Switch, Radio, Progress). Put `primary-foreground` on it, never white.
- Use `secondary` and `ghost`/`outline` Buttons for every other action.
- `destructive` is for errors and delete actions only. As a fill, use it at 10% (light) or 20% (dark) opacity behind `destructive` text, as the Button and Badge variants do.
- `warning` is for cautions that are not errors: a broken house rule, a Pokémon over the level cap, a risky choice. Use it like `destructive`: `warning` text, and a 10% (20% dark) fill behind it. Always add the word or a `WarningIcon`; never rely on amber alone. No component has a warning variant, so set it with `className` (see the Badge and Alert guides).
- `border` is on every element by default. It is decorative (under 3:1); never use a border alone to show that something is a control.
- Charts use `chart-1` to `chart-5`: one purple hue in five lightness steps, so series stay apart in grayscale. Keep series order light to dark.
- The sidebar has its own set (`sidebar`, `sidebar-primary`, `sidebar-accent`, …). Use those inside the sidebar only.

## Typography

- One family: Geist for all UI text (`sans`, and `heading` which points to it). Geist Mono (`mono`) only for keyboard hints, IDs, seeds and other code-like text. In the app they load through `next/font`; `components/bundle.css` imports both from Google Fonts.
- `text-sm` (14/20) is the default UI size. `text-xs` for Badges and helper text; `text-base` for Inputs on mobile so iOS does not zoom.
- Two weights only: 400 for reading text, 500 (`font-medium`) for labels, buttons, titles and menu items. Do not use bold.
- Card titles use `card-title` (16px, 500); the Alert dialog title uses `text-lg` at 500.

## Shape and depth

- Corners are large and soft. Every radius comes from the base `radius` (0.625rem). Buttons, Cards and Dialogs use `radius-4xl`; Inputs, Badges and popovers `radius-3xl`; Alerts, Textareas and menu items `radius-2xl`.
- Controls are pills: at their height `radius-4xl` and `radius-3xl` round the ends fully.
- Separate raised surfaces with a shadow plus a 1px `foreground` ring at 5% (10% in dark), not a border. `shadow-md` for Cards, `shadow-lg` for popovers and menus, `shadow-xl` for Dialogs, Drawers and Sheets.

## Spacing and sizing

- Spacing is the Tailwind 4px step. Cards pad by `spacing-6` (24px), or `spacing-4` with `size="sm"`.
- Control heights: 24px (`xs`), 32px (`sm`), 36px (default), 40px (`lg`). Inputs and Select triggers are 36px, matching the default Button. Badges are 20px.
- Button side padding is `spacing-3`; icons inside are 16px (12px at `xs`) with a `spacing-1.5` gap.

## States

- Focus: a solid `ring` border plus a 3px `ring` halo at 30–50% opacity (`focus-visible` only). The halo alone is under 3:1, so keep the border.
- Invalid: set `aria-invalid`; the control gets a `destructive` border and a 20% (40% dark) `destructive` halo.
- Hover: `primary` fills drop to 80%; neutral controls fill with `muted`. Pressed Buttons move down 1px.
- Disabled: 50% opacity, no pointer events.

## Motion

- Overlays (Dialog, Popover, menus, Sheet) fade and zoom or slide in through `tw-animate-css`, about 100–200ms. Theme changes do not animate (`disableTransitionOnChange`).

## Iconography

- Use Phosphor icons (`@phosphor-icons/react`), regular weight, imported as `<Name>Icon` (`CaretDownIcon`, `XIcon`, `DotsThreeIcon`). They take `currentColor`.
- Size icons at 16px in default controls and 12px in `xs` controls and Badges. Mark them `data-icon="inline-start"` or `"inline-end"` inside a Button so the padding adjusts.
- Outside the app, every Phosphor icon (1,530 names, Phosphor 2.1.10) is on `window.Nuzlocke` with the same name and props as in the app: `<Nuzlocke.WarningIcon size={16} />`, `IconContext` for defaults. They come from `components/lib/phosphor-regular.js`, which holds the regular weight only: a `weight` prop is accepted but always draws regular.
- There is no logo yet. Set the name "nuzlocke.gg" in Geist at weight 500 until one exists.

## Components

The shared package `@workspace/ui` has 39 components, imported one per file: `import { Button } from "@workspace/ui/components/button"`. Each has a guide and a live preview here, in six groups:

- **Actions:** Button, Button group, Toggle, Toggle group
- **Forms:** Input, Input group, Textarea, Label, Field, Checkbox, Radio group, Switch, Select, Combobox
- **Overlays:** Dialog, Alert dialog, Sheet, Drawer, Popover, Tooltip, Dropdown menu, Command
- **Navigation:** Breadcrumb, Navigation menu, Pagination, Tabs, Sidebar
- **Feedback:** Alert, Toast, Progress, Spinner, Skeleton
- **Data display:** Badge, Card, Item, Table, Accordion, Kbd, Separator

Use these before you write new UI. To show a selected option (Caught / Missed, Party / Box), use Toggle group, not Buttons or Tabs. Combine them; do not restyle their radius, color or height per page. Read a component's guide for its props, parts and do's and don'ts.

### Component guides

Read a component's guide before you use it: `components/<Name>/README.md`, for example `components/Button/README.md` or `components/DropdownMenu/README.md`. Each guide lists the real props (`variant`, `size`, `value` …), parts and do's and don'ts. Each component's types are in `components/index.d.ts`, as `<Name>Props`.

| Group | Guides |
| --- | --- |
| Actions | [Button](components/Button/README.md) · [ButtonGroup](components/ButtonGroup/README.md) · [Toggle](components/Toggle/README.md) · [ToggleGroup](components/ToggleGroup/README.md) |
| Forms | [Input](components/Input/README.md) · [InputGroup](components/InputGroup/README.md) · [Textarea](components/Textarea/README.md) · [Label](components/Label/README.md) · [Field](components/Field/README.md) · [Checkbox](components/Checkbox/README.md) · [RadioGroup](components/RadioGroup/README.md) · [Switch](components/Switch/README.md) · [Select](components/Select/README.md) · [Combobox](components/Combobox/README.md) |
| Overlays | [Dialog](components/Dialog/README.md) · [AlertDialog](components/AlertDialog/README.md) · [Sheet](components/Sheet/README.md) · [Drawer](components/Drawer/README.md) · [Popover](components/Popover/README.md) · [Tooltip](components/Tooltip/README.md) · [DropdownMenu](components/DropdownMenu/README.md) · [Command](components/Command/README.md) |
| Navigation | [Breadcrumb](components/Breadcrumb/README.md) · [NavigationMenu](components/NavigationMenu/README.md) · [Pagination](components/Pagination/README.md) · [Tabs](components/Tabs/README.md) · [Sidebar](components/Sidebar/README.md) |
| Feedback | [Alert](components/Alert/README.md) · [Toast](components/Toast/README.md) · [Progress](components/Progress/README.md) · [Spinner](components/Spinner/README.md) · [Skeleton](components/Skeleton/README.md) |
| Data display | [Badge](components/Badge/README.md) · [Card](components/Card/README.md) · [Item](components/Item/README.md) · [Table](components/Table/README.md) · [Accordion](components/Accordion/README.md) · [Kbd](components/Kbd/README.md) · [Separator](components/Separator/README.md) |

## Using the components outside the app

The components also run as one browser script. Load these files in this order:

```html
<link rel="stylesheet" href="components/bundle.css">
<script src="components/lib/react.production.min.js"></script>
<script src="components/lib/react-dom.production.min.js"></script>
<script src="components/lib/phosphor-regular.js"></script>
<script src="components/bundle.js"></script>
```

- `bundle.css` is complete: it holds every token value (colors in both themes, radii, shadows, font stacks) and imports Geist and Geist Mono from Google Fonts. To show text before the font loads, also add `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`.
- If a `tokens.css` from this system is on the page, it overrides the token values in `bundle.css`; you do not need it.
- Dark mode: set `data-theme="dark"` (or the class `dark`) on `<html>`.
- Every export is on `window.Nuzlocke`: `Nuzlocke.Button`, `Nuzlocke.DialogContent`, `Nuzlocke.toast`, and every Phosphor icon (`Nuzlocke.WarningIcon`). The icon file can load before or after `bundle.js`; the icons are also on `window.NuzlockeIcons`.
- React 18 and React 19 both work. If your environment already supplies React (for example React 18 on a Design canvas), use that copy and skip `components/lib/react.production.min.js` and `react-dom.production.min.js`; never load a second React. Still load `phosphor-regular.js`. On React 18 the bundle wraps each component in `forwardRef`, so refs reach Base UI and Popover, Tooltip, Dropdown menu and Combobox position correctly.
- Hosts that put each component and icon in its own `display: contents` element (the Design canvas) are handled for every component: `bundle.js` tags those wrappers `data-ds-contents`, and `bundle.css` has copies of each child, sibling and position rule (`A > B`, `L ~ R`, `peer-*`, `:first-child`, `:last-child`, `:nth-*`) that look through them. Mount icons as components (`<Nuzlocke.WarningIcon />`); do not add your own `:first-child` or `:last-child` fixes.
- `bundle.css` has only the Tailwind classes that the components and previews use, plus the `warning` classes. Lay out your own markup with your own CSS, or with the classes you see in the previews.

## Not synced

- Radius steps are `calc()` of `radius` in the source; the tokens and `bundle.css` use the resolved values (`radius-4xl` is 26px).
- Fonts are Google-hosted (Geist, Geist Mono); no font files are stored.
- No logo or icon files exist in the repository.
- Toggle and Toggle group were added to `packages/ui` with the shadcn CLI (base-luma style) for this system.
- `components/lib/phosphor-regular.js` is generated from `@phosphor-icons/react` 2.1.10 as installed in the app: every icon, regular weight, checked to render the same markup as the package. It changes only when the app's Phosphor version changes; the build regenerates it.
- This system is built from the repo by `packages/claude-design` (`npm run claude-design`). The wrapper support is generated there from the components' own CSS (every rule with `>`, `~`, `+` or a position pseudo-class), so new components get it too; the app's source does not need it.
- The bundle makes the components work on React 18 by wrapping each one in `forwardRef`; the app itself uses React 19 and needs no wrapper.
- The bundle and previews are built from `packages/ui` with React 19.2.8. Preview content is sample data; the Sidebar preview uses `collapsible="none"` because its other modes need the full window.
