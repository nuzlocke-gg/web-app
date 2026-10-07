export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** horizontal: h-px w-full. vertical: w-px, stretches to the row height. */
  orientation?: "horizontal" | "vertical"
  /** Base UI render prop: render as another element. */
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Separator(props: SeparatorProps): React.ReactElement
