export interface CheckboxProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "onChange" | "defaultChecked"
> {
  /** Controlled checked state. */
  checked?: boolean
  /** Initial checked state. Default false. */
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean, eventDetails: object) => void
  /** Mixed state. Default false. */
  indeterminate?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Form field name for the hidden input. */
  name?: string
  value?: string
  /** Shows the `destructive` border and ring. */
  "aria-invalid"?: boolean | "true" | "false"
  /** Base UI render prop. */
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
/** 16px square, `rounded-[5px]`; `bg-primary` with a check when on. */
export declare function Checkbox(props: CheckboxProps): React.ReactElement
