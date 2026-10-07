export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {}
export declare function Breadcrumb(props: BreadcrumbProps): React.ReactElement
export declare function BreadcrumbList(
  props: React.OlHTMLAttributes<HTMLOListElement>
): React.ReactElement
export declare function BreadcrumbItem(
  props: React.LiHTMLAttributes<HTMLLIElement>
): React.ReactElement
/** A link; `render` (Base UI) swaps the `<a>` for another element, such as a router link. */
export declare function BreadcrumbLink(
  props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    render?: React.ReactElement | ((props: object) => React.ReactElement)
  }
): React.ReactElement
/** The current page, with `aria-current="page"`. */
export declare function BreadcrumbPage(
  props: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement
/** Shows a caret-right icon unless you pass children. */
export declare function BreadcrumbSeparator(
  props: React.LiHTMLAttributes<HTMLLIElement>
): React.ReactElement
export declare function BreadcrumbEllipsis(
  props: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement
