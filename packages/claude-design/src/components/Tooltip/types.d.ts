type RenderProp = React.ReactElement | ((props: object) => React.ReactElement)
type Side = "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end"

export interface TooltipProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  onOpenChangeComplete?: (open: boolean) => void
  disabled?: boolean
  children?: React.ReactNode
}
export declare function Tooltip(props: TooltipProps): React.ReactElement
export declare function TooltipProvider(props: {
  /** ms before a tooltip opens. Default 0. */
  delay?: number
  /** ms before a tooltip closes. */
  closeDelay?: number
  children?: React.ReactNode
}): React.ReactElement
export declare function TooltipTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    render?: RenderProp
    delay?: number
    closeDelay?: number
  }
): React.ReactElement
export declare function TooltipContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    side?: Side
    align?: "start" | "center" | "end"
    sideOffset?: number
    alignOffset?: number
    render?: RenderProp
  }
): React.ReactElement
