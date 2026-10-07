export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** 50% opacity, not-allowed cursor. */
  disabled?: boolean
  /** Shows the `destructive` border and ring. */
  "aria-invalid"?: boolean | "true" | "false"
}
/** Grows with content (`field-sizing-content`); `min-h-16` (64px), `rounded-2xl`. */
export declare function Textarea(props: TextareaProps): React.ReactElement
