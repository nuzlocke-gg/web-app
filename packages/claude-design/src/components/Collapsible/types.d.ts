export interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  disabled?: boolean
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Collapsible(props: CollapsibleProps): React.ReactElement
export declare function CollapsibleTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    render?: React.ReactElement | ((props: object) => React.ReactElement)
  }
): React.ReactElement
export declare function CollapsibleContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    keepMounted?: boolean
    hiddenUntilFound?: boolean
  }
): React.ReactElement
