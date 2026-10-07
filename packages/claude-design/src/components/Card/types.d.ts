export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Spacing: default 24px, sm 16px. */
  size?: "default" | "sm"
}
export declare function Card(props: CardProps): React.ReactElement
export declare function CardHeader(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function CardTitle(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function CardDescription(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function CardAction(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function CardContent(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
export declare function CardFooter(
  props: React.HTMLAttributes<HTMLDivElement>
): React.ReactElement
