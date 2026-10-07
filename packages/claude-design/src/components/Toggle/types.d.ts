export interface ToggleProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value"
> {
  /** `default` has no fill; `outline` adds an `input` border. */
  variant?: "default" | "outline"
  /** Height: sm 32px, default 36px, lg 40px. */
  size?: "default" | "sm" | "lg"
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean, eventDetails: unknown) => void
  /** Identifies the toggle inside a ToggleGroup. */
  value?: string
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Toggle(props: ToggleProps): React.ReactElement
/** Class names for a Toggle look on another element. */
export declare function toggleVariants(
  options?: Pick<ToggleProps, "variant" | "size"> & { className?: string }
): string
