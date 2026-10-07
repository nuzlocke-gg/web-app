export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {}
export declare function Pagination(props: PaginationProps): React.ReactElement
export declare function PaginationContent(
  props: React.HTMLAttributes<HTMLUListElement>
): React.ReactElement
export declare function PaginationItem(
  props: React.LiHTMLAttributes<HTMLLIElement>
): React.ReactElement
export interface PaginationLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Current page: `outline` button and `aria-current="page"`; otherwise `ghost`. */
  isActive?: boolean
  /** Button size. Default `icon` (36px square). */
  size?:
    "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
}
export declare function PaginationLink(
  props: PaginationLinkProps
): React.ReactElement
/** Label defaults to "Previous"; hidden below `sm`. */
export declare function PaginationPrevious(
  props: PaginationLinkProps & { text?: string }
): React.ReactElement
/** Label defaults to "Next"; hidden below `sm`. */
export declare function PaginationNext(
  props: PaginationLinkProps & { text?: string }
): React.ReactElement
export declare function PaginationEllipsis(
  props: React.HTMLAttributes<HTMLSpanElement>
): React.ReactElement
