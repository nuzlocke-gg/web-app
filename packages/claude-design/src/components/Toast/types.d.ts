type RenderProp = React.ReactElement | ((props: object) => React.ReactElement)

export interface ToastAddOptions {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Picks the icon: success, info, warning, error (destructive tint), loading (spins). */
  type?: "success" | "info" | "warning" | "error" | "loading" | (string & {})
  /** ms before auto close; 0 keeps it open. */
  timeout?: number
  priority?: "low" | "high"
  /** Props for the action button, e.g. `{ children: "Undo", onClick }`. */
  actionProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
  onClose?: () => void
  onRemove?: () => void
  data?: object
}
export interface ToastManager {
  add(options: ToastAddOptions): string
  close(id?: string): void
  update(id: string, options: ToastAddOptions): void
  promise<V>(
    promise: Promise<V>,
    options: {
      loading: string | ToastAddOptions
      success:
        string | ToastAddOptions | ((result: V) => string | ToastAddOptions)
      error:
        | string
        | ToastAddOptions
        | ((error: unknown) => string | ToastAddOptions)
    }
  ): Promise<V>
}

/** The provider plus the default toast stack. Render once near the app root. */
export interface ToasterProps {
  /** Default ms before a toast closes; 0 keeps toasts open. */
  timeout?: number
  /** Max toasts shown at once. */
  limit?: number
  /** Defaults to the exported `toast` manager. */
  toastManager?: ToastManager
  children?: React.ReactNode
}
export declare function Toaster(props: ToasterProps): React.ReactElement
/** The default manager used by Toaster: `toast.add({ title, description, type })`. */
export declare const toast: ToastManager
export declare function createToastManager(): ToastManager
export declare function useToastManager(): ToastManager & {
  toasts: Array<ToastAddOptions & { id: string }>
}

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The toast object from `useToastManager().toasts`. */
  toast: ToastAddOptions & { id: string }
  swipeDirection?:
    "up" | "down" | "left" | "right" | Array<"up" | "down" | "left" | "right">
  render?: RenderProp
}
export declare function Toast(props: ToastProps): React.ReactElement
export declare function ToastContent(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ToastTitle(
  props: React.HTMLAttributes<HTMLHeadingElement>
): React.ReactElement
export declare function ToastDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
): React.ReactElement
/** Outline sm button; hidden when it has no children. */
export declare function ToastAction(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
/** Ghost icon-sm button labelled "Close toast". */
export declare function ToastClose(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
export declare function ToastProvider(props: ToasterProps): React.ReactElement
export declare function ToastPortal(props: {
  children?: React.ReactNode
  container?: HTMLElement | null
}): React.ReactElement
export declare function ToastViewport(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
