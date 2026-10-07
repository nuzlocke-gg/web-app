type SelectRender = React.ReactElement | ((props: object) => React.ReactElement)
export interface SelectProps {
  children?: React.ReactNode
  /** Controlled chosen value (array when `multiple`). */
  value?: unknown
  /** Initial chosen value. */
  defaultValue?: unknown
  onValueChange?: (value: unknown, eventDetails: object) => void
  /** Controlled open state. */
  open?: boolean
  /** Open on first render. Default false. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  /** Labels for values, so SelectValue shows the label. */
  items?:
    | Record<string, React.ReactNode>
    | ReadonlyArray<{ label: React.ReactNode; value: unknown }>
  multiple?: boolean
  /** Locks page scroll while open. Default true. */
  modal?: boolean
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  /** Form field name. */
  name?: string
  itemToStringLabel?: (value: unknown) => string
  itemToStringValue?: (value: unknown) => string
}
/** Base UI Select.Root. */
export declare function Select(props: SelectProps): React.ReactElement
export declare function SelectTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: "default" | "sm"
    render?: SelectRender
  }
): React.ReactElement
export declare function SelectValue(
  props: Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
    placeholder?: React.ReactNode
    children?: React.ReactNode | ((value: unknown) => React.ReactNode)
  }
): React.ReactElement
export declare function SelectContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    /** Default `bottom`. */
    side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"
    /** Default 4. */
    sideOffset?: number
    /** Default `center`. */
    align?: "start" | "center" | "end"
    /** Default 0. */
    alignOffset?: number
    /** Open over the trigger with the chosen item on it. Default true. */
    alignItemWithTrigger?: boolean
  }
): React.ReactElement
export declare function SelectGroup(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SelectLabel(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SelectItem(
  props: React.HTMLAttributes<HTMLDivElement> & {
    value: unknown
    disabled?: boolean
    label?: string
  }
): React.ReactElement
export declare function SelectSeparator(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SelectScrollUpButton(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function SelectScrollDownButton(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
