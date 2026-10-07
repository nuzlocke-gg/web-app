# Alert

A bordered `rounded-2xl` callout for a message the player must notice, with an optional icon, title, description and action.

## When to use

- Inline status on a page: a rule reminder, a fainted Pokémon, a sync failure.
- `default` for information; `destructive` for loss or errors.
- Warning (not a variant; the `warning` token): `className="text-warning"` with a `WarningIcon` first. The title and icon turn `warning`; the description stays `muted-foreground`. Use it for a broken rule or a risk, not an error.
- Not for brief confirmation of an action; use Toast.

## What you provide

- An optional icon as the first child (16px; it aligns to the title).
- `AlertTitle` with a short line, and `AlertDescription` with one or two sentences.
- `AlertAction` for one small button at the top right; the alert adds right padding for it.
- The root has `role="alert"` (assertive: a screen reader interrupts to read it when it appears). Your `role` prop overrides it:
  - `role="status"` for a quiet message that appears after an action, such as a warning or a rule reminder. It is read when the reader is idle.
  - `role={undefined}` for a message that is part of the page when it loads; no live region is needed.
  - Keep `role="alert"` only for errors the player must act on now.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `role` | `alert` `status` or `undefined` — see above | `alert` |
| `variant` | `default` (`card` / `card-foreground`) `destructive` (`destructive` text on `card`) | `default` |

All other props go to the `<div>`.

## Parts

- `AlertTitle` — `font-medium` line.
- `AlertDescription` — `muted-foreground` text (`destructive/90` in the destructive variant).
- `AlertAction` — absolute at top 10px, right 12px.

## Do and don't

- Do lead the title with the fact: "Torchic fainted", not "Warning".
- Do use a `sm` Button in `AlertAction`.
- Don't fill the alert with `destructive` color; the variant changes only the text and icon.

Source: `packages/ui/src/components/alert.tsx`.
