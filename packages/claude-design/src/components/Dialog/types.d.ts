type RenderProp = React.ReactElement | ((props: object) => React.ReactElement)

export interface DialogProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  onOpenChangeComplete?: (open: boolean) => void
  /** `true` locks scroll and traps focus; `"trap-focus"` only traps focus. */
  modal?: boolean | "trap-focus"
  /** Do not close on an outside click. */
  disablePointerDismissal?: boolean
  children?: React.ReactNode
}
export declare function Dialog(props: DialogProps): React.ReactElement
export declare function DialogTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
export declare function DialogContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    /** Adds the ghost icon-sm close button top right. */
    showCloseButton?: boolean
    render?: RenderProp
  }
): React.ReactElement
export declare function DialogHeader(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function DialogFooter(
  props: React.HTMLAttributes<HTMLDivElement> & {
    /** Adds an outline "Close" button after the children. */
    showCloseButton?: boolean
  }
): React.ReactElement
export declare function DialogTitle(
  props: React.HTMLAttributes<HTMLHeadingElement>
): React.ReactElement
export declare function DialogDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
): React.ReactElement
export declare function DialogClose(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
export declare function DialogOverlay(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function DialogPortal(props: {
  children?: React.ReactNode
  container?: HTMLElement | null
  keepMounted?: boolean
}): React.ReactElement
