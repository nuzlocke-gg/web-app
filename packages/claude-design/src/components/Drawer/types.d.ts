type RenderProp = React.ReactElement | ((props: object) => React.ReactElement)
type DrawerSnapPoint = number | string

export interface DrawerProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  onOpenChangeComplete?: (open: boolean) => void
  /** Overlay is shown only when `true`. */
  modal?: boolean | "trap-focus"
  /** Swipe direction to close; also sets the edge. */
  swipeDirection?: "down" | "up" | "left" | "right"
  /** Shows the 100px swipe handle bar. */
  showSwipeHandle?: boolean
  snapPoints?: DrawerSnapPoint[]
  snapPoint?: DrawerSnapPoint | null
  defaultSnapPoint?: DrawerSnapPoint | null
  onSnapPointChange?: (
    snapPoint: DrawerSnapPoint | null,
    eventDetails: object
  ) => void
  disablePointerDismissal?: boolean
  children?: React.ReactNode
}
export declare function Drawer(props: DrawerProps): React.ReactElement
export declare function DrawerTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
export declare function DrawerContent(
  props: React.HTMLAttributes<HTMLDivElement> & { render?: RenderProp }
): React.ReactElement
export declare function DrawerHeader(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function DrawerFooter(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function DrawerTitle(
  props: React.HTMLAttributes<HTMLHeadingElement>
): React.ReactElement
export declare function DrawerDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
): React.ReactElement
export declare function DrawerClose(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
export declare function DrawerSwipeHandle(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function DrawerOverlay(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function DrawerPortal(props: {
  children?: React.ReactNode
  container?: HTMLElement | null
  keepMounted?: boolean
}): React.ReactElement
