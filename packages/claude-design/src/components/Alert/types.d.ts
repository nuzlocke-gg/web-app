export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `destructive` changes text and icon to `destructive`; the surface stays `card`. */
  variant?: "default" | "destructive"
  /** Default `alert` (assertive). Pass `status` for a quiet message, or `undefined` for static content. */
  role?: "alert" | "status" | undefined
}
export declare function Alert(props: AlertProps): React.ReactElement
export declare function AlertTitle(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function AlertDescription(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
/** Positioned top right; the alert adds right padding when present. */
export declare function AlertAction(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
