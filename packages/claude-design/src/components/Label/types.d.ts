export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** The `id` of the control this label names. */
  htmlFor?: string
}
/** `text-sm font-medium` label; a flex row with `gap-2` so it can wrap a control. */
export declare function Label(props: LabelProps): React.ReactElement
