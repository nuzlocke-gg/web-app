# Progress

A 12px `rounded-full` bar that fills with `primary` to show how far a task or run has come, with an optional label and value, built on Base UI Progress.

## When to use

- Determinate progress: badges earned, routes cleared, an upload.
- Not for unknown waits; use Spinner.

## What you provide

- `value` (number, or `null` for indeterminate) and `max` if not 100.
- `ProgressLabel` as a child for an accessible name.
- `ProgressValue` as a child to show the value. With no children it shows the formatted value; pass a function `(formattedValue, value) => node` for custom text such as "5 of 8".
- The track and indicator are added for you after the children.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` | number or `null` | — (required) |
| `min` / `max` | number | `0` / `100` |
| `format` | `Intl.NumberFormatOptions` | percent |
| `locale` | locale for formatting | runtime locale |
| `getAriaValueText` | `(formatted, value) => string` | — |

## Parts

- `ProgressLabel` — `text-sm font-medium` label.
- `ProgressValue` — `muted-foreground`, `tabular-nums`, pushed to the right.
- `ProgressTrack` — the 12px `muted` track (added by the root).
- `ProgressIndicator` — the `primary` fill (added by the root).

## Do and don't

- Do put label and value on one line above the bar (the root wraps).
- Do use `max` with a custom `ProgressValue` for counts.
- Don't render your own `ProgressTrack` inside `Progress`; the root already adds one.

Source: `packages/ui/src/components/progress.tsx`.
