import type { PlaceId, SpeciesId } from "@workspace/game-data"

import { UNKNOWN_SPECIES } from "@/components/species-name"
import type { HistoryLine } from "@/lib/runs/history"
import type { PokemonState } from "@/lib/runs/state"

/**
 * How History names a Species and a location in the Pokémon's Game. A
 * location it does not know is undefined.
 * @example
 * const names: HistoryNames = {
 *   speciesName: (species) => speciesName(map, species),
 *   placeName: (place) => placeName(map, place, journey.gameId),
 * }
 */
export type HistoryNames = {
  speciesName: (species: SpeciesId) => string
  placeName: (place: PlaceId) => string | undefined
}

/**
 * The text of one History line of a Pokémon, such as "Met as Nincada at
 * Route 116", "Evolved into Ninjask", or "Died at level 14 to Roxanne's
 * Nosepass".
 */
export function historyText(
  names: HistoryNames,
  pokemon: PokemonState,
  line: HistoryLine
): string {
  switch (line.kind) {
    case "encounter": {
      const { encounter } = line
      const where = names.placeName(encounter.placeId) ?? "an unknown location"
      const met = encounter.met
        ? names.speciesName(encounter.met.species)
        : UNKNOWN_SPECIES

      if (encounter.origin === "trade") return `Traded for ${met} at ${where}`

      const verb = encounter.origin === "gift" ? "Received" : "Met"
      // The Species met is news only once the Pokémon is another Species.
      const as =
        encounter.met?.species === pokemon.species.species ? "" : ` as ${met}`

      return `${verb}${as} at ${where}`
    }
    case "evolution":
      return `Evolved into ${names.speciesName(line.line.to.species)}`
    case "death":
      return [
        "Died",
        line.level !== null ? `at level ${line.level}` : null,
        line.cause ? `to ${line.cause}` : null,
      ]
        .filter((part) => part !== null)
        .join(" ")
  }
}

/**
 * The date of a History line, such as "Oct 2", with the year when it is not
 * `thisYear`. In the reader's locale and time zone.
 */
export function historyDate(enteredAt: number, thisYear: number): string {
  const date = new Date(enteredAt)

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === thisYear ? undefined : "numeric",
  })
}
