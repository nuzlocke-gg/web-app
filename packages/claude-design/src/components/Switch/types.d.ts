export interface SwitchProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "onChange" | "defaultChecked"
> {
  /** default 20×44px, sm 16×28px. */
  size?: "default" | "sm"
  /** Controlled on state. */
  checked?: boolean
  /** Initial on state. Default false. */
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean, eventDetails: object) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Form field name for the hidden input. */
  name?: string
  value?: string
  /** Base UI render prop. */
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Switch(props: SwitchProps): React.ReactElement
