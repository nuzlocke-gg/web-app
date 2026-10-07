export interface NavigationMenuProps extends React.HTMLAttributes<HTMLElement> {
  /** Popup alignment to the trigger. */
  align?: "start" | "center" | "end"
  /** The open item's `value`; `null` when closed. */
  value?: any
  defaultValue?: any
  onValueChange?: (value: any, eventDetails: object) => void
  orientation?: "horizontal" | "vertical"
  /** ms before opening on hover. Default 50. */
  delay?: number
  /** ms before closing on hover out. Default 50. */
  closeDelay?: number
  onOpenChangeComplete?: (open: boolean) => void
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function NavigationMenu(
  props: NavigationMenuProps
): React.ReactElement
export declare function NavigationMenuList(
  props: React.HTMLAttributes<HTMLUListElement>
): React.ReactElement
export declare function NavigationMenuItem(
  props: React.HTMLAttributes<HTMLLIElement> & { value?: any }
): React.ReactElement
export declare function NavigationMenuTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
): React.ReactElement
export declare function NavigationMenuContent(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function NavigationMenuLink(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    active?: boolean
    closeOnClick?: boolean
    render?: React.ReactElement | ((props: object) => React.ReactElement)
  }
): React.ReactElement
export declare function NavigationMenuIndicator(
  props: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement
/** Rendered by the root. Defaults: side "bottom", sideOffset 8, align "start". */
export declare function NavigationMenuPositioner(
  props: React.HTMLAttributes<HTMLDivElement> & {
    side?: "top" | "right" | "bottom" | "left"
    sideOffset?: number
    align?: "start" | "center" | "end"
    alignOffset?: number
  }
): React.ReactElement
/** Class names for a link that looks like a trigger. */
export declare function navigationMenuTriggerStyle(options?: {
  className?: string
}): string
