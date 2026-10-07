# AlertDialog

A modal that asks the user to confirm or cancel an important action, such as marking a Pokémon as fainted.

## When to use

- Before a destructive or permanent action: release, mark as fainted, delete a run.
- When the user must make a choice; it does not close on an outside click.
- For a task with fields, use Dialog.

## What you provide

- `AlertDialogTitle` as a question ("Release Pidgey?") and `AlertDialogDescription` that says what happens.
- `AlertDialogCancel` with a safe label and `AlertDialogAction` with the verb from the title.
- Optional `AlertDialogMedia` with one icon (shown in a 64px `bg-muted` circle).
- `AlertDialogTrigger` with `render={<Button … />}`, or control `open`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `open` / `defaultOpen` | boolean | `false` |
| `onOpenChange` | `(open, details) => void` | — |
| `AlertDialogContent` `size` | `default` (`max-w-xs`, `sm:max-w-md`, left-aligned from `sm`) `sm` (`max-w-xs`, centered, two-column footer) | `default` |
| `AlertDialogAction` `variant` / `size` | Button variants and sizes | `default` / `default` |
| `AlertDialogCancel` `variant` / `size` | Button variants and sizes | `outline` / `default` |

`AlertDialog` is the Base UI `AlertDialog.Root`; it renders no element.

## Parts

- `AlertDialogTrigger` — opens the alert.
- `AlertDialogContent` — the panel: `rounded-4xl`, `bg-popover`, `p-6`, `gap-6`. Renders the portal and overlay. No close button.
- `AlertDialogHeader` — grid for media, title and description.
- `AlertDialogMedia` — icon circle, `size-16 rounded-full bg-muted`.
- `AlertDialogTitle` — `text-lg font-medium`.
- `AlertDialogDescription` — `text-sm text-muted-foreground`.
- `AlertDialogFooter` — the two buttons.
- `AlertDialogAction` — a plain `Button`; add your own `onClick`. It does not close the alert by itself.
- `AlertDialogCancel` — a Base UI Close rendered as a `Button`.
- `AlertDialogOverlay`, `AlertDialogPortal` — used inside `AlertDialogContent`.

## Do and don't

- Do use `variant="destructive"` on the action for release or fainted actions.
- Do name the Pokémon or run in the title so the user knows what they confirm.
- Don't use "OK" and "Cancel"; use a verb on the action.

Source: `packages/ui/src/components/alert-dialog.tsx`.
