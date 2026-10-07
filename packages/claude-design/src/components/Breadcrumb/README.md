# Breadcrumb

A row of links that shows where the current page sits in the run hierarchy, ending in the current page.

## When to use

- At the top of nested pages: Runs > Emerald run > Routes > Route 104.
- Not for steps in a flow; use Tabs or a stepper for that.

## What you provide

- `Breadcrumb` (a `<nav aria-label="breadcrumb">`) wrapping one `BreadcrumbList`.
- One `BreadcrumbItem` per level, with a `BreadcrumbLink` (an `<a>`; use `render` for a router link) or, for the last level, `BreadcrumbPage`.
- A `BreadcrumbSeparator` between items. It shows a caret-right icon (14px) unless you pass `children`.
- `BreadcrumbEllipsis` for hidden levels. It has the screen reader text "More".

## Props

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `BreadcrumbLink` | `render` | element or function (Base UI) | `<a>` |
| `BreadcrumbSeparator` | `children` | any node | `CaretRightIcon` |

All parts pass other props to their DOM element (`nav`, `ol`, `li`, `a`, `span`).

## Parts

- `BreadcrumbList` — the `<ol>`: wraps, `text-sm`, `muted-foreground`, gap 6px (10px from `sm`).
- `BreadcrumbItem` — an `<li>` for one level.
- `BreadcrumbLink` — a link that turns `foreground` on hover.
- `BreadcrumbPage` — the current page in `foreground`, with `aria-current="page"`.
- `BreadcrumbSeparator` — a presentational `<li>` between items.
- `BreadcrumbEllipsis` — a 20px dots icon for collapsed levels.

## Do and don't

- Do end with `BreadcrumbPage`, not a link to the page you are on.
- Do collapse middle levels with `BreadcrumbEllipsis` when the trail is longer than four items.
- Don't color links with `primary`; the list uses `muted-foreground` and links go to `foreground` on hover.

Source: `packages/ui/src/components/breadcrumb.tsx`.
