export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. `default` is the purple primary action. */
  variant?:
    "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  /** Height: xs 24px, sm 32px, default 36px, lg 40px; icon sizes are square. */
  size?:
    "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  /** Base UI render prop: render as another element. */
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Button(props: ButtonProps): React.ReactElement
/** Class names for a Button look on another element. */
export declare function buttonVariants(
  options?: Pick<ButtonProps, "variant" | "size"> & { className?: string }
): string
