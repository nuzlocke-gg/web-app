export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Native input type. */
  type?: React.HTMLInputTypeAttribute
  /** 50% opacity, no pointer events. */
  disabled?: boolean
  /** Shows the `destructive` border and ring. */
  "aria-invalid"?: boolean | "true" | "false"
}
/** 36px (`h-9`), `rounded-3xl` text field on a `bg-input/50` fill. */
export declare function Input(props: InputProps): React.ReactElement
