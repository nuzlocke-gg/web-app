export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Value of the selected tab. */
  value?: any
  /** Default 0. */
  defaultValue?: any
  onValueChange?: (value: any, eventDetails: object) => void
  orientation?: "horizontal" | "vertical"
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Tabs(props: TabsProps): React.ReactElement
/** `default`: pill on `muted`. `line`: underline on the active tab. */
export declare function TabsList(
  props: React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "line"
    activateOnFocus?: boolean
    loopFocus?: boolean
  }
): React.ReactElement
export declare function TabsTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: any
    disabled?: boolean
  }
): React.ReactElement
export declare function TabsContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    value: any
    keepMounted?: boolean
  }
): React.ReactElement
/** Class names for the tab list look. */
export declare function tabsListVariants(options?: {
  variant?: "default" | "line"
  className?: string
}): string
