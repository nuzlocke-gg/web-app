type RenderProp = React.ReactElement | ((props: object) => React.ReactElement)
type ButtonVariant =
  "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
type ButtonSize =
  "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"

export interface AlertDialogProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  onOpenChangeComplete?: (open: boolean) => void
  children?: React.ReactNode
}
export declare function AlertDialog(props: AlertDialogProps): React.ReactElement
export declare function AlertDialogTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
export declare function AlertDialogContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    /** `default`: max-w-xs, sm:max-w-md, left-aligned from sm. `sm`: max-w-xs, centered, two-column footer. */
    size?: "default" | "sm"
    render?: RenderProp
  }
): React.ReactElement
export declare function AlertDialogHeader(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function AlertDialogFooter(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
/** 64px muted circle for one icon. */
export declare function AlertDialogMedia(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function AlertDialogTitle(
  props: React.HTMLAttributes<HTMLHeadingElement>
): React.ReactElement
export declare function AlertDialogDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
): React.ReactElement
/** A plain Button; it does not close the alert by itself. */
export declare function AlertDialogAction(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
    render?: RenderProp
  }
): React.ReactElement
/** Closes the alert. Defaults to variant "outline". */
export declare function AlertDialogCancel(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
  }
): React.ReactElement
export declare function AlertDialogOverlay(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function AlertDialogPortal(props: {
  children?: React.ReactNode
  container?: HTMLElement | null
  keepMounted?: boolean
}): React.ReactElement
