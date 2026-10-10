import {
  getSpecies,
  type LoadedMap,
  type SpeciesId,
} from "@workspace/game-data"

/** What the screens call a Species that the Map does not have. */
export const UNKNOWN_SPECIES = "Unknown Pokémon"

/**
 * The name of a Species in the Map, or {@link UNKNOWN_SPECIES} when the Map
 * does not have it.
 */
export function speciesName(map: LoadedMap, species: SpeciesId): string {
  return getSpecies(map, species)?.name ?? UNKNOWN_SPECIES
}
