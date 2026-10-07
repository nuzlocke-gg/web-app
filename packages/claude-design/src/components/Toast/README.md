# Toast

A short message that slides up in the bottom-right corner to confirm an action or report a status, then closes by itself.

## When to use

- To confirm a finished action: "Encounter saved", "Run synced".
- To offer a quick undo with an action button.
- Not for errors the user must fix in a form; show those next to the field.

## What you provide

- One `<Toaster>` near the root of the app. It renders the stack.
- Calls to `toast.add({ title, description, type, timeout, actionProps })` from anywhere.
- `type`: `success`, `info`, `warning`, `error` or `loading` picks the icon; any other value shows no icon.
- `actionProps: { children: "Undo", onClick }` adds an `outline` `sm` action button.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `Toaster` `timeout` | ms before auto close; `0` keeps it open | `5000` |
| `Toaster` `limit` | max toasts shown | `3` |
| `Toaster` `toastManager` | a manager from `createToastManager()` | the exported `toast` |
| `toast.add` `title` / `description` | ReactNode | — |
| `toast.add` `type` | `success` `info` `warning` `error` `loading` | — |
| `toast.add` `timeout` | ms | `Toaster` `timeout` |
| `toast.add` `priority` | `low` `high` | `low` |

`toast` also has `close(id)`, `update(id, options)` and `promise(promise, { loading, success, error })`.

## Parts

- `Toaster` — provider plus portal, viewport and the default toast layout.
- `toast` — the default manager: `toast.add(…)`.
- `createToastManager`, `useToastManager` — make another manager or read toasts in a component.
- `Toast` — one toast root: `rounded-2xl`, `border`, `bg-popover`, `shadow-lg`; stacks with a 0.75rem peek.
- `ToastContent` — the row, `p-4`, `gap-3`.
- `ToastTitle` — `text-sm font-medium`.
- `ToastDescription` — `text-sm text-muted-foreground`.
- `ToastAction` — `outline` `sm` button; hidden when it has no children.
- `ToastClose` — `ghost` `icon-sm` close button, label "Close toast".
- `ToastProvider`, `ToastPortal`, `ToastViewport` — pieces for a custom layout. The viewport is `fixed`, bottom-right from `sm`, `max-w-sm`.

## Do and don't

- Do keep the title to a few words and put detail in the description.
- Do use `type: "error"` for failures; only that icon is tinted `destructive`.
- Don't render more than one `Toaster`.

Source: `packages/ui/src/components/toast.tsx`.
