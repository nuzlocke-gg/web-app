# Table

A plain, full-width data table with bordered rows, a `muted` hover and an optional caption, wrapped in a horizontal scroll container.

## When to use

- Data with columns to compare: encounters by route, level and status.
- Not for a short list of rich rows; use Item.

## What you provide

- `TableHeader` with one `TableRow` of `TableHead` cells.
- `TableBody` with `TableRow`s of `TableCell`s.
- Optional `TableFooter` for totals and `TableCaption` for a short description (shown below the table).
- Right-align numbers with `text-right` and use `tabular-nums`.
- Set `data-state="selected"` on a row to show it as selected.

## Props

`Table` and all parts take the props of their HTML element (`table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `caption`). There are no variants.

## Parts

- `TableHeader` — the `<thead>`; its rows have a bottom border.
- `TableBody` — the `<tbody>`; the last row has no border.
- `TableFooter` — the `<tfoot>`, `muted/50` and `font-medium`.
- `TableRow` — a row with a bottom border and `muted/50` hover.
- `TableHead` — a 48px header cell, `font-medium`, `foreground`.
- `TableCell` — a cell with 12px padding; text does not wrap.
- `TableCaption` — `text-sm muted-foreground`, 16px above.

## Do and don't

- Do keep cell text short; cells use `whitespace-nowrap` and the table scrolls sideways.
- Do use Badge for status columns.
- Don't add borders between columns; rows only.

Source: `packages/ui/src/components/table.tsx`.
