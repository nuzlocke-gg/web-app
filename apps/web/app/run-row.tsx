import { CaretRightIcon } from "@phosphor-icons/react/ssr"
import type { MapSummary } from "@workspace/game-data"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@workspace/ui/components/item"
import Link from "next/link"

import type { RunListRow } from "@/lib/runs/list"

type RunRowProps = {
  run: RunListRow
  /** The Maps to find the Run's Game in, such as `listMaps()`. */
  maps: readonly MapSummary[]
}

/**
 * One Run of the Run list: its Game's monogram, its name and Game, and a link
 * to its tracking screen. A Game the Maps do not know shows as unknown.
 */
export function RunRow({ run, maps }: RunRowProps) {
  const game = maps
    .find((map) => map.id === run.mapId)
    ?.games.find((candidate) => candidate.id === run.gameId)
  const gameName = game?.name ?? "Unknown game"

  return (
    <Item
      variant="muted"
      size="sm"
      render={
        <Link
          href={`/runs/${run.id}`}
          aria-label={`${run.name}, ${gameName}`}
        />
      }
    >
      {/* The starter's sprite replaces the Game monogram with the full rows. */}
      <ItemMedia
        variant="image"
        aria-hidden
        className="bg-background text-xs font-medium text-muted-foreground"
      >
        {game?.monogram ?? "?"}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{run.name}</ItemTitle>
        <ItemDescription>{gameName}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <CaretRightIcon aria-hidden className="text-muted-foreground" />
      </ItemActions>
    </Item>
  )
}
