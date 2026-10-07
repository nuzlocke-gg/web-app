export interface CommandProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** Accessible label for the command menu. */
  label?: string
  /** Set false to filter items yourself. */
  shouldFilter?: boolean
  filter?: (value: string, search: string, keywords?: string[]) => number
  /** Highlighted item value. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Wrap arrow-key navigation at the ends. */
  loop?: boolean
  disablePointerSelection?: boolean
  vimBindings?: boolean
}
export declare function Command(props: CommandProps): React.ReactElement
export declare function CommandDialog(props: {
  /** Screen-reader title. Default "Command Palette". */
  title?: string
  /** Screen-reader description. Default "Search for a command to run...". */
  description?: string
  showCloseButton?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  className?: string
  children: React.ReactNode
}): React.ReactElement
export declare function CommandInput(
  props: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > & {
    value?: string
    onValueChange?: (search: string) => void
  }
): React.ReactElement
export declare function CommandList(
  props: React.HTMLAttributes<HTMLDivElement> & { label?: string }
): React.ReactElement
export declare function CommandEmpty(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function CommandGroup(
  props: Omit<React.HTMLAttributes<HTMLDivElement>, "heading" | "value"> & {
    heading?: React.ReactNode
    value?: string
    forceMount?: boolean
  }
): React.ReactElement
export declare function CommandItem(
  props: Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "value"> & {
    value?: string
    keywords?: string[]
    disabled?: boolean
    onSelect?: (value: string) => void
    forceMount?: boolean
  }
): React.ReactElement
export declare function CommandShortcut(
  props: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement
export declare function CommandSeparator(
  props: React.HTMLAttributes<HTMLDivElement> & { alwaysRender?: boolean }
): React.ReactElement
