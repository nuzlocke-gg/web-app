export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value; `null` for indeterminate. */
  value: number | null
  /** Default 0. */
  min?: number
  /** Default 100. */
  max?: number
  /** Number format for the value text. Default: percent. */
  format?: Intl.NumberFormatOptions
  locale?: Intl.LocalesArgument
  getAriaValueText?: (formattedValue: string, value: number | null) => string
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Progress(props: ProgressProps): React.ReactElement
export declare function ProgressTrack(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ProgressIndicator(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ProgressLabel(
  props: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement
export declare function ProgressValue(
  props: Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
    children?:
      | null
      | ((
          formattedValue: string | null,
          value: number | null
        ) => React.ReactNode)
  }
): React.ReactElement
