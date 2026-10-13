import "server-only"

import {
  getForm,
  getGame,
  loadMap,
  placeName,
  type FormRef,
  type GameId,
  type LoadedMap,
  type MapId,
} from "@workspace/game-data"

import type { PlaceRef } from "./place"

/** What a change names from the game data. */
export type GameDataEntry = {
  place?: PlaceRef
  form?: FormRef
}

/**
 * The server-only game-data gate: whether the Journey's Game has every Place,
 * Species, and Form the change names. A change that fails it is refused as
 * `unknown-entry`. The predictor never asks it, because the browser's Map can
 * be older than the server's. A Custom Place passes: the change's `check`
 * already found it in the locked Run.
 */
export async function passesGameDataGate(
  mapId: MapId,
  gameId: GameId,
  entry: GameDataEntry
): Promise<boolean> {
  const map = await loadMap(mapId)

  if (!map || !getGame(map, gameId)) return false

  if (entry.place && !gameHasPlace(map, gameId, entry.place)) return false

  if (entry.form && !getForm(map, entry.form.species, entry.form.form)) {
    return false
  }

  return true
}

function gameHasPlace(
  map: LoadedMap,
  gameId: GameId,
  place: PlaceRef
): boolean {
  switch (place.kind) {
    case "game":
      return placeName(map, place.id, gameId) !== undefined
    case "custom":
      return true
  }
}

/**
 * Whether a Pokémon of the Map can reach the level, at most its `maxLevel`.
 * A death level that fails it is refused as `level-out-of-range`. An unknown
 * Map allows no level.
 */
export async function levelInRange(
  mapId: MapId,
  level: number
): Promise<boolean> {
  const map = await loadMap(mapId)

  return map !== undefined && level <= map.data.maxLevel
}
