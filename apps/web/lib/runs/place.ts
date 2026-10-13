import {
  placeName,
  suggestions,
  type GameId,
  type LoadedMap,
  type PlaceId,
  type SuggestionGroup,
} from "@workspace/game-data"
import { z } from "zod"

import type { RunState } from "./state"

// This module is the one home of the two kinds of Place: a Place of the
// Game, from the game data, and a Custom Place of the Run. Code elsewhere
// compares Places with `placeKey` or `samePlace` and names them with
// `locationName`, so it never asks which kind a Place is.

/** The Place an Encounter names: a Place of the Game or a Custom Place of the Run. */
export type PlaceRef =
  { kind: "game"; id: PlaceId } | { kind: "custom"; id: string }

/** A {@link PlaceRef} in the arguments of a change. */
export const placeRef = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("game"), id: z.string().min(1) }),
  z.object({ kind: z.literal("custom"), id: z.uuid() }),
])

/**
 * A string unique to one Place of a Run, for Map keys, React keys, and
 * element ids.
 */
export function placeKey(place: PlaceRef): string {
  return `${place.kind}:${place.id}`
}

/** Whether two references name the same Place. */
export function samePlace(a: PlaceRef, b: PlaceRef): boolean {
  return a.kind === b.kind && a.id === b.id
}

/**
 * The name of a Place as the screen shows it: a Game Place in the Journey's
 * Game, or a Custom Place by its name in the Run. Undefined when the Map is
 * not loaded or does not have the Place, or the Custom Place is gone.
 */
export function locationName(
  map: LoadedMap | undefined,
  run: RunState,
  place: PlaceRef,
  gameId: GameId
): string | undefined {
  switch (place.kind) {
    case "game":
      return map && placeName(map, place.id, gameId)
    case "custom":
      return run.customPlaces.find((custom) => custom.id === place.id)?.name
  }
}

/** The encounter table of a Place in a Game. A Custom Place has none. */
export function encounterTableOf(
  map: LoadedMap,
  place: PlaceRef,
  gameId: GameId
): SuggestionGroup[] {
  switch (place.kind) {
    case "game":
      return suggestions(map, place.id, gameId)
    case "custom":
      return []
  }
}

/** Whether the reference names a Custom Place that the Run no longer has. */
export function customPlaceGone(run: RunState, place: PlaceRef): boolean {
  switch (place.kind) {
    case "game":
      return false
    case "custom":
      return !run.customPlaces.some((custom) => custom.id === place.id)
  }
}

/** The Place columns of an `encounters` row. Exactly one is set. */
export type PlaceColumns = {
  placeId: PlaceId | null
  customPlaceId: string | null
}

/** The `encounters` columns that store a Place. */
export function placeColumns(place: PlaceRef): PlaceColumns {
  switch (place.kind) {
    case "game":
      return { placeId: place.id, customPlaceId: null }
    case "custom":
      return { placeId: null, customPlaceId: place.id }
  }
}

/**
 * The Place an `encounters` row names. Throws when the row names none, which
 * the table's CHECK forbids.
 */
export function placeRefOf(columns: PlaceColumns): PlaceRef {
  if (columns.placeId !== null) return { kind: "game", id: columns.placeId }

  if (columns.customPlaceId !== null) {
    return { kind: "custom", id: columns.customPlaceId }
  }

  throw new Error("An Encounter row names no Place")
}
