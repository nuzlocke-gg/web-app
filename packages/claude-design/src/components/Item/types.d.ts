export interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "muted"
  size?: "default" | "sm" | "xs"
  /** Base UI render prop: render as another element, such as a link. */
  render?: React.ReactElement | ((props: object) => React.ReactElement)
}
export declare function Item(props: ItemProps): React.ReactElement
export declare function ItemGroup(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ItemSeparator(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
/** `icon` sizes svgs to 16px; `image` is a 40px rounded box (32px sm, 24px xs). */
export declare function ItemMedia(
  props: React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "icon" | "image"
  }
): React.ReactElement
export declare function ItemContent(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ItemTitle(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ItemDescription(
  props: React.HTMLAttributes<HTMLParagraphElement>
): React.ReactElement
export declare function ItemActions(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ItemHeader(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function ItemFooter(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
