import "server-only"

import {
  getForm,
  getGame,
  loadMap,
  placeName,
  type FormRef,
  type GameId,
  type MapId,
  type PlaceId,
} from "@workspace/game-data"

/** What a change names from the game data. */
export type GameDataEntry = {
  placeId?: PlaceId
  form?: FormRef
}

/**
 * The server-only game-data gate: whether the Journey's Game has every Place,
 * Species, and Form the change names. A change that fails it is refused as
 * `unknown-entry`. The predictor never asks it, because the browser's Map can
 * be older than the server's.
 */
export async function passesGameDataGate(
  mapId: MapId,
  gameId: GameId,
  entry: GameDataEntry
): Promise<boolean> {
  const map = await loadMap(mapId)

  if (!map || !getGame(map, gameId)) return false

  if (entry.placeId !== undefined && !placeName(map, entry.placeId, gameId)) {
    return false
  }

  if (entry.form && !getForm(map, entry.form.species, entry.form.form)) {
    return false
  }

  return true
}
