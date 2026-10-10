import type {
  FormRef,
  Origin,
  Species,
  SpeciesId,
  SuggestionGroup,
} from "@workspace/game-data"

import { UNKNOWN_SPECIES } from "@/components/species-name"

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
 * the Map's order, then "Other species" with every other Species in the order
 * given.
 * @param suggested The location's method groups, from `suggestions()`.
 * @param allSpecies Every Species of the Map, such as `map.data.species`.
 */
export function speciesGroups(
  suggested: readonly SuggestionGroup[],
  allSpecies: readonly Species[]
): SpeciesGroup[] {
  const nameOf = new Map(
    allSpecies.map((species) => [species.id, species.name])
  )
  const groups = suggested.map((group) => ({
    name: group.name,
    choices: group.entries.map((met) => ({
      met,
      name: nameOf.get(met.species) ?? UNKNOWN_SPECIES,
      group: { name: group.name, origin: group.origin },
    })),
  }))
  const suggestedIds = new Set(
    suggested.flatMap((group) => group.entries.map((entry) => entry.species))
  )
  const others = allSpecies
    .filter((species) => !suggestedIds.has(species.id))
    .map((species) => choiceOf(species, null))

  return [...groups, { name: "Other species", choices: others }]
}

/**
 * The choices for a search's matches, in their order. A Species that the
 * location suggests keeps its first method group.
 * @param suggested The location's method groups, from `suggestions()`.
 * @param matches The Species that match, such as `searchSpecies(map, query)`.
 */
export function searchChoices(
  suggested: readonly SuggestionGroup[],
  matches: readonly Species[]
): SpeciesChoice[] {
  const groupOf = new Map<string, SuggestedGroup>()

  for (const group of suggested) {
    for (const entry of group.entries) {
      if (!groupOf.has(entry.species)) {
        groupOf.set(entry.species, { name: group.name, origin: group.origin })
      }
    }
  }

  return matches.map((species) =>
    choiceOf(species, groupOf.get(species.id) ?? null)
  )
}

/** A Species in its first Form. */
function choiceOf(
  species: Species,
  group: SuggestedGroup | null
): SpeciesChoice {
  return {
    met: { species: species.id, form: species.forms[0]!.id },
    name: species.name,
    group,
  }
}

/** The two groups of the Evolve Drawer. */
export type EvolveGroups = {
  /** "Next in its line": what the Species evolves into. */
  next: SpeciesChoice[]
  /** "Other species", to correct a wrong Species. */
  others: SpeciesChoice[]
}

/**
 * The groups of the Evolve Drawer for a Pokémon of the `current` Species:
 * its next Species first, then every other Species but its own. A search
 * keeps only its matches, in their order.
 * @param next What the Species evolves into, from `nextInLine()`.
 * @param allSpecies Every Species of the Map, such as `map.data.species`.
 * @param matches The Species that match a search, such as
 * `searchSpecies(map, query)`; null while the player does not search.
 */
export function evolveGroups(
  current: SpeciesId,
  next: readonly FormRef[],
  allSpecies: readonly Species[],
  matches: readonly Species[] | null
): EvolveGroups {
  const nameOf = new Map(
    allSpecies.map((species) => [species.id, species.name])
  )
  const matched = matches && new Set(matches.map((species) => species.id))
  const isNext = (species: SpeciesId) =>
    next.some((target) => target.species === species)

  return {
    next: next
      .filter((target) => !matched || matched.has(target.species))
      .map((target) => ({
        met: target,
        name: nameOf.get(target.species) ?? UNKNOWN_SPECIES,
        group: null,
      })),
    others: (matches ?? allSpecies)
      .filter((species) => species.id !== current && !isNext(species.id))
      .map((species) => choiceOf(species, null)),
  }
}
