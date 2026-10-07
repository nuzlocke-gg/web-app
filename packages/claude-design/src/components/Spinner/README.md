# Spinner

A spinning icon that shows something is loading.

## When to use

- Inside a button while its action runs: "Saving run".
- Next to a short label while data loads: "Loading routes".
- For page or card content that is loading, prefer Skeleton.

## What you provide

- Nothing required. It has `role="status"` and `aria-label="Loading"`; pass another `aria-label` for context.
- In a button, add `data-icon="inline-start"` and disable the button.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `className` | size and color, such as `size-6 text-muted-foreground` | `size-4 animate-spin` |

All other props pass to the Phosphor `SpinnerIcon` (an `<svg>`). It uses `currentColor`.

## Do and don't

- Do set the size with `size-*` classes; the default is `size-4` (16px).
- Do let it inherit text color, or use `muted-foreground` next to muted text.
- Don't show a spinner and a progress bar for the same task.

Source: `packages/ui/src/components/spinner.tsx`.
