type RenderProp = React.ReactElement | ((props: object) => React.ReactElement)

export interface SheetProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  onOpenChangeComplete?: (open: boolean) => void
  modal?: boolean | "trap-focus"
  disablePointerDismissal?: boolean
  children?: React.ReactNode
}
export declare function Sheet(props: SheetProps): React.ReactElement
export declare function SheetTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
export declare function SheetContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    /** Edge the sheet slides from. Left/right: w-3/4, sm:max-w-sm, full height. */
    side?: "top" | "right" | "bottom" | "left"
    /** Adds the ghost icon-sm close button top right. */
    showCloseButton?: boolean
    render?: RenderProp
  }
): React.ReactElement
export declare function SheetHeader(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SheetFooter(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SheetTitle(
  props: React.HTMLAttributes<HTMLHeadingElement>
): React.ReactElement
export declare function SheetDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
): React.ReactElement
export declare function SheetClose(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
