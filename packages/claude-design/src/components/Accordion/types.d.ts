export interface AccordionProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "defaultValue"
> {
  /** Values of the open items. */
  value?: any[]
  defaultValue?: any[]
  onValueChange?: (value: any[], eventDetails: object) => void
  /** Allow more than one open item. Default false. */
  multiple?: boolean
  disabled?: boolean
  orientation?: "vertical" | "horizontal"
  hiddenUntilFound?: boolean
  keepMounted?: boolean
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Accordion(props: AccordionProps): React.ReactElement
export declare function AccordionItem(
  props: React.HTMLAttributes<HTMLDivElement> & {
    value?: any
    disabled?: boolean
    onOpenChange?: (open: boolean, eventDetails: object) => void
  }
): React.ReactElement
export declare function AccordionTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
): React.ReactElement
export declare function AccordionContent(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
