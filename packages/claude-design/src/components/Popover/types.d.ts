type RenderProp = React.ReactElement | ((props: object) => React.ReactElement)
type Side = "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end"

export interface PopoverProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  onOpenChangeComplete?: (open: boolean) => void
  modal?: boolean | "trap-focus"
  children?: React.ReactNode
}
export declare function Popover(props: PopoverProps): React.ReactElement
export declare function PopoverTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    render?: RenderProp
    openOnHover?: boolean
  }
): React.ReactElement
export declare function PopoverContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    side?: Side
    align?: "start" | "center" | "end"
    sideOffset?: number
    alignOffset?: number
    render?: RenderProp
  }
): React.ReactElement
export declare function PopoverHeader(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function PopoverTitle(
  props: React.HTMLAttributes<HTMLHeadingElement>
): React.ReactElement
export declare function PopoverDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
): React.ReactElement
