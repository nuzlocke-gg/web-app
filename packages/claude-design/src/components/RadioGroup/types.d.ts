export interface RadioGroupProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** Controlled chosen value. */
  value?: unknown
  /** Initial chosen value. */
  defaultValue?: unknown
  onValueChange?: (value: unknown, eventDetails: object) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Form field name. */
  name?: string
  /** Base UI render prop. */
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
/** `grid w-full gap-3` container for RadioGroupItem options. */
export declare function RadioGroup(props: RadioGroupProps): React.ReactElement
export interface RadioGroupItemProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "onChange"
> {
  /** Required. The value this option sets. */
  value: unknown
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
}
/** 16px circle; `bg-primary` with a `primary-foreground` dot when chosen. */
export declare function RadioGroupItem(
  props: RadioGroupItemProps
): React.ReactElement
