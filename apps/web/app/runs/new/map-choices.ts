import type { MapSummary } from "@workspace/game-data"

/** The Maps of one region, for the "Choose a map" Drawer. */
export type RegionMaps = { region: string; maps: MapSummary[] }

/**
 * Groups Maps by region. Takes the Maps in release order and keeps it: the
 * regions come in the order of their first Map, and the Maps of a region in
 * release order.
 */
export function mapsByRegion(maps: readonly MapSummary[]): RegionMaps[] {
  const groups = new Map<string, MapSummary[]>()

  for (const map of maps) {
    const regionMaps = groups.get(map.region) ?? []

    regionMaps.push(map)
    groups.set(map.region, regionMaps)
  }

  return [...groups].map(([region, regionMaps]) => ({
    region,
    maps: regionMaps,
  }))
}

/** "Generation 3 · 1 game", the detail line of a Map. */
export function mapDetail(map: MapSummary): string {
  const games = map.games.length === 1 ? "1 game" : `${map.games.length} games`

  return `Generation ${map.generation} · ${games}`
}

/** The name a new Run on this Game starts with. */
export function suggestedRunName(gameName: string): string {
  return `${gameName} Hardcore`
}
