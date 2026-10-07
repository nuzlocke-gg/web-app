export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Direction. Only the outer ends keep `rounded-4xl`; inner edges join. */
  orientation?: "horizontal" | "vertical"
}
export declare function ButtonGroup(props: ButtonGroupProps): React.ReactElement
/** A static label cell (`bg-muted`, `rounded-4xl`). Base UI render prop supported. */
export declare function ButtonGroupText(
  props: React.HTMLAttributes<HTMLDivElement> & {
    render?: React.ReactElement | ((props: object) => React.ReactElement)
  }
): React.ReactElement
/** A 1px `bg-input` divider between items. */
export declare function ButtonGroupSeparator(
  props: React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical"
  }
): React.ReactElement
/** Class names for the ButtonGroup look on another element. */
export declare function buttonGroupVariants(
  options?: Pick<ButtonGroupProps, "orientation"> & { className?: string }
): string
