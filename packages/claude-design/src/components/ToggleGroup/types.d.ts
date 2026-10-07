export interface ToggleGroupProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** Passed to every item. */
  variant?: "default" | "outline"
  /** Passed to every item. */
  size?: "default" | "sm" | "lg"
  /** Gap in spacing steps; 0 joins items into one pill. */
  spacing?: number
  orientation?: "horizontal" | "vertical"
  /** Pressed item values. Always an array. */
  value?: readonly string[]
  defaultValue?: readonly string[]
  onValueChange?: (value: string[], eventDetails: unknown) => void
  /** Allow more than one pressed item. */
  multiple?: boolean
  disabled?: boolean
  loopFocus?: boolean
}
export declare function ToggleGroup(props: ToggleGroupProps): React.ReactElement
export declare function ToggleGroupItem(
  props: ToggleProps & { value: string }
): React.ReactElement
