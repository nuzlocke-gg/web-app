export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Look. `destructive` is a tinted fill with `destructive` text. */
  variant?:
    "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"
  /** Base UI render prop: render as another element, such as a link. */
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
/** 20px (`h-5`), `rounded-3xl`, `text-xs` pill label. */
export declare function Badge(props: BadgeProps): React.ReactElement
/** Class names for a Badge look on another element. */
export declare function badgeVariants(
  options?: Pick<BadgeProps, "variant"> & { className?: string }
): string
