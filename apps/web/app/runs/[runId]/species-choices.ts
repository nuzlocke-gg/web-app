import {
  searchSpecies,
  suggestions,
  type FormRef,
  type GameId,
  type LoadedMap,
  type Origin,
  type PlaceId,
  type Species,
} from "@workspace/game-data"

/** One Species the player can pick in step 1 of the record Drawer. */
export type SpeciesChoice = {
  met: FormRef
  name: string
  /** The method group it was suggested in at this location, if any. */
  group: SuggestedGroup | null
}

/** A method group that suggests a Species at a location. */
export type SuggestedGroup = {
  name: string
  /** The origin step 2 starts with. */
  origin: Origin
}

/** One titled group of step 1: a method group, or "Other species". */
export type SpeciesGroup = {
  name: string
  choices: SpeciesChoice[]
}

/**
 * Step 1 of the record Drawer at a location: its Species by method group in
 * the Map's order, then "Other species" with every other Species of the Map
 * in dex order.
 */
export function speciesGroups(
  map: LoadedMap,
  placeId: PlaceId,
  gameId: GameId
): SpeciesGroup[] {
  const groups = suggestions(map, placeId, gameId).map((group) => ({
    name: group.name,
    choices: group.entries.map((met) => ({
      met,
      name: map.species.get(met.species)?.name ?? "Unknown Pokémon",
      group: { name: group.name, origin: group.origin },
    })),
  }))
  const suggested = new Set(
    groups.flatMap((group) => group.choices.map((choice) => choice.met.species))
  )
  const others = map.data.species
    .filter((species) => !suggested.has(species.id))
    .map((species) => otherChoice(species))

  return [...groups, { name: "Other species", choices: others }]
}

/**
 * The Species matching a search, over every Species of the Map. A Species
 * that the location suggests keeps its first method group.
 */
export function searchChoices(
  map: LoadedMap,
  placeId: PlaceId,
  gameId: GameId,
  query: string
): SpeciesChoice[] {
  const groupOf = new Map<string, SuggestedGroup>()

  for (const group of suggestions(map, placeId, gameId)) {
    for (const entry of group.entries) {
      if (!groupOf.has(entry.species)) {
        groupOf.set(entry.species, { name: group.name, origin: group.origin })
      }
    }
  }

  return searchSpecies(map, query).map((species) =>
    otherChoice(species, groupOf.get(species.id))
  )
}

function otherChoice(
  species: Species,
  group: SuggestedGroup | null = null
): SpeciesChoice {
  return {
    met: { species: species.id, form: species.forms[0]!.id },
    name: species.name,
    group,
  }
}
