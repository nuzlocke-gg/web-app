type RenderProp = React.ReactElement | ((props: object) => React.ReactElement)
type Side = "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end"
type ItemProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Indents to line up with items that have an icon. */
  inset?: boolean
  disabled?: boolean
  closeOnClick?: boolean
  render?: RenderProp
}
type ContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: Side
  align?: "start" | "center" | "end"
  sideOffset?: number
  alignOffset?: number
  render?: RenderProp
}

export interface DropdownMenuProps {
  /** Controlled open state. */
  open?: boolean
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  onOpenChangeComplete?: (open: boolean) => void
  modal?: boolean
  disabled?: boolean
  loopFocus?: boolean
  children?: React.ReactNode
}
export declare function DropdownMenu(
  props: DropdownMenuProps
): React.ReactElement
export declare function DropdownMenuTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { render?: RenderProp }
): React.ReactElement
export declare function DropdownMenuContent(
  props: ContentProps
): React.ReactElement
export declare function DropdownMenuGroup(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function DropdownMenuLabel(
  props: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
): React.ReactElement
export declare function DropdownMenuItem(
  props: ItemProps & {
    variant?: "default" | "destructive"
    onClick?: React.MouseEventHandler<HTMLDivElement>
  }
): React.ReactElement
export declare function DropdownMenuCheckboxItem(
  props: ItemProps & {
    checked?: boolean
    defaultChecked?: boolean
    onCheckedChange?: (checked: boolean, eventDetails: object) => void
  }
): React.ReactElement
export declare function DropdownMenuRadioGroup(
  props: React.HTMLAttributes<HTMLDivElement> & {
    value?: unknown
    defaultValue?: unknown
    onValueChange?: (value: unknown, eventDetails: object) => void
  }
): React.ReactElement
export declare function DropdownMenuRadioItem(
  props: ItemProps & { value: unknown }
): React.ReactElement
export declare function DropdownMenuSeparator(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function DropdownMenuShortcut(
  props: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement
export declare function DropdownMenuSub(props: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  disabled?: boolean
  children?: React.ReactNode
}): React.ReactElement
export declare function DropdownMenuSubTrigger(
  props: ItemProps
): React.ReactElement
/** Defaults: side "right", align "start", alignOffset -3, sideOffset 0. */
export declare function DropdownMenuSubContent(
  props: ContentProps
): React.ReactElement
export declare function DropdownMenuPortal(props: {
  children?: React.ReactNode
  container?: HTMLElement | null
  keepMounted?: boolean
}): React.ReactElement
