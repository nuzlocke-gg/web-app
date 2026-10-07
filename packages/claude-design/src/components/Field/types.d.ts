export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `responsive` stacks, then becomes a row when the parent FieldGroup is @md wide. */
  orientation?: "vertical" | "horizontal" | "responsive"
  /** Set to "true" to color the field `destructive`. */
  "data-invalid"?: boolean | "true" | "false"
  /** Set to "true" to dim the label. */
  "data-disabled"?: boolean | "true" | "false"
}
export declare function Field(props: FieldProps): React.ReactElement
export declare function FieldSet(
  props: React.FieldsetHTMLAttributes<HTMLFieldSetElement>
): React.ReactElement
export declare function FieldLegend(
  props: React.HTMLAttributes<HTMLLegendElement> & {
    variant?: "legend" | "label"
  }
): React.ReactElement
export declare function FieldGroup(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function FieldContent(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function FieldLabel(
  props: React.LabelHTMLAttributes<HTMLLabelElement>
): React.ReactElement
export declare function FieldTitle(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function FieldDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
): React.ReactElement
/** Shows `children`, or the unique `errors[].message` values. Renders nothing when empty. */
export declare function FieldError(
  props: React.HTMLAttributes<HTMLDivElement> & {
    errors?: Array<{ message?: string } | undefined>
  }
): React.ReactElement | null
export declare function FieldSeparator(
  props: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
): React.ReactElement
