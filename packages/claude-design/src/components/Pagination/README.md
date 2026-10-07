# Pagination

A centered row of page links with previous and next controls, built from ghost and outline Buttons.

## When to use

- Long lists split into pages: encounters, the box, run history.
- Not for infinite feeds; load more or scroll instead.

## What you provide

- `Pagination` (a `<nav aria-label="pagination">`) wrapping one `PaginationContent`.
- One `PaginationItem` per control, holding a `PaginationLink`, `PaginationPrevious`, `PaginationNext` or `PaginationEllipsis`.
- `href` on each link and `isActive` on the current page.
- `text` on Previous/Next to change the label. The label hides below the `sm` breakpoint; the `aria-label` stays.

## Props

| Part | Prop | Values | Default |
| --- | --- | --- | --- |
| `PaginationLink` | `isActive` | boolean — `outline` button and `aria-current="page"`; else `ghost` | `false` |
| `PaginationLink` | `size` | Button sizes: `default` `xs` `sm` `lg` `icon` `icon-xs` `icon-sm` `icon-lg` | `icon` (36px square) |
| `PaginationPrevious` / `PaginationNext` | `text` | string | `Previous` / `Next` |

Other props go to the `<a>`.

## Parts

- `PaginationContent` — the `<ul>`, gap 4px.
- `PaginationItem` — an `<li>`.
- `PaginationLink` — a page number rendered as a Button on an `<a>`.
- `PaginationPrevious` / `PaginationNext` — `default`-size links with a caret icon.
- `PaginationEllipsis` — a 36px dots icon with "More pages" for screen readers.

## Do and don't

- Do show the first, last and nearby pages and use `PaginationEllipsis` for gaps.
- Do mark exactly one link `isActive`.
- Don't pass a `variant`; the active state picks `outline` vs `ghost` for you.

Source: `packages/ui/src/components/pagination.tsx`.
