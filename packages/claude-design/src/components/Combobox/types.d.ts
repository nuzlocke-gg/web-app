type ComboboxRender =
  React.ReactElement | ((props: object) => React.ReactElement)
export interface ComboboxProps {
  children?: React.ReactNode
  /** The items to filter and show (strings, objects or groups). */
  items?: ReadonlyArray<unknown>
  /** Controlled chosen item (array when `multiple`). */
  value?: unknown
  /** Initial chosen item. */
  defaultValue?: unknown
  onValueChange?: (value: unknown, eventDetails: object) => void
  /** Controlled typed text. */
  inputValue?: string
  defaultInputValue?: string
  onInputValueChange?: (inputValue: string, eventDetails: object) => void
  /** Controlled open state. */
  open?: boolean
  /** Open on first render. Default false. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, eventDetails: object) => void
  /** Pick several values. Default false. */
  multiple?: boolean
  /** Custom match, or null to turn filtering off. */
  filter?: null | ((item: unknown, query: string) => boolean)
  itemToStringLabel?: (item: unknown) => string
  itemToStringValue?: (item: unknown) => string
  /** Highlight the first match while typing. Default false. */
  autoHighlight?: boolean
  /** Default false. */
  modal?: boolean
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  name?: string
}
/** Base UI Combobox.Root. */
export declare function Combobox(props: ComboboxProps): React.ReactElement
/** An InputGroup with the input, caret (`showTrigger`, default true) and clear (`showClear`, default false) buttons. */
export declare function ComboboxInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    showTrigger?: boolean
    showClear?: boolean
    disabled?: boolean
  }
): React.ReactElement
export declare function ComboboxContent(
  props: React.HTMLAttributes<HTMLDivElement> & {
    /** Default `bottom`. */
    side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"
    /** Default 6. */
    sideOffset?: number
    /** Default `start`. */
    align?: "start" | "center" | "end"
    /** Default 0. */
    alignOffset?: number
    /** Element to position against, such as the chips field. */
    anchor?: React.RefObject<HTMLElement | null>
  }
): React.ReactElement
export declare function ComboboxList(
  props: Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
    children?: React.ReactNode | ((item: any, index: number) => React.ReactNode)
  }
): React.ReactElement
export declare function ComboboxItem(
  props: React.HTMLAttributes<HTMLDivElement> & {
    value: unknown
    disabled?: boolean
  }
): React.ReactElement
export declare function ComboboxGroup(
  props: React.HTMLAttributes<HTMLDivElement> & {
    items?: ReadonlyArray<unknown>
  }
): React.ReactElement
export declare function ComboboxLabel(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ComboboxCollection(props: {
  children: (item: any, index: number) => React.ReactNode
}): React.ReactElement
export declare function ComboboxEmpty(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ComboboxSeparator(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ComboboxChips(
  props: React.HTMLAttributes<HTMLDivElement> & {
    ref?: React.Ref<HTMLDivElement>
  }
): React.ReactElement
export declare function ComboboxChip(
  props: React.HTMLAttributes<HTMLDivElement> & { showRemove?: boolean }
): React.ReactElement
export declare function ComboboxChipsInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
): React.ReactElement
export declare function ComboboxTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    render?: ComboboxRender
  }
): React.ReactElement
export declare function ComboboxValue(props: {
  placeholder?: React.ReactNode
  children?: React.ReactNode | ((value: unknown) => React.ReactNode)
}): React.ReactElement
/** Returns a ref for ComboboxChips and ComboboxContent `anchor`. */
export declare function useComboboxAnchor(): React.MutableRefObject<HTMLDivElement | null>
