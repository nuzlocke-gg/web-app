export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}
/** Wraps one control plus addons. 36px and `rounded-4xl` with an input. */
export declare function InputGroup(props: InputGroupProps): React.ReactElement
export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Where the addon sits. */
  align?: "inline-start" | "inline-end" | "block-start" | "block-end"
}
export declare function InputGroupAddon(
  props: InputGroupAddonProps
): React.ReactElement
export interface InputGroupButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  /** xs 24px (default), sm, icon-xs 24px square, icon-sm 32px square. */
  size?: "xs" | "sm" | "icon-xs" | "icon-sm"
  /** Button variant. Default `ghost`. */
  variant?:
    "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  /** Default `button`. */
  type?: "button" | "submit" | "reset"
  /** Base UI render prop. */
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function InputGroupButton(
  props: InputGroupButtonProps
): React.ReactElement
export declare function InputGroupText(
  props: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement
export declare function InputGroupInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
): React.ReactElement
export declare function InputGroupTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
): React.ReactElement
