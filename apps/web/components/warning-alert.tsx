import { WarningIcon } from "@phosphor-icons/react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { cn } from "@workspace/ui/lib/utils"
import type { ComponentProps, ReactNode } from "react"

type WarningAlertProps = {
  /** The name of the Rule. */
  rule: string
  /** What breaks it. */
  text: string
  /** Content after the text, such as the control that goes to the row. */
  children?: ReactNode
} & Omit<ComponentProps<typeof Alert>, "children" | "role">

/**
 * A quiet amber Alert for one Warning, with the WarningIcon and the Rule's
 * name beside the amber. A `status`, so a screen reader reads it without
 * interrupting.
 */
export function WarningAlert({
  rule,
  text,
  children,
  className,
  ...props
}: WarningAlertProps) {
  return (
    <Alert role="status" className={cn("text-warning", className)} {...props}>
      <WarningIcon aria-hidden />
      <AlertTitle>{rule}</AlertTitle>
      <AlertDescription>{text}</AlertDescription>
      {children}
    </Alert>
  )
}

/**
 * The small amber mark beside a Species that a Warning is about, named for
 * screen readers.
 */
export function WarningMark({ rule }: { rule: string }) {
  return (
    <WarningIcon
      role="img"
      aria-label={`Warning: ${rule}`}
      className="size-3.5 shrink-0 text-warning"
    />
  )
}
