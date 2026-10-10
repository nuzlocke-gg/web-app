import { getSpecies, placeName, type LoadedMap } from "@workspace/game-data"

import type { HistoryLine } from "@/lib/runs/history"
import type { PokemonState } from "@/lib/runs/state"

/**
 * The text of one History line of a Pokémon in a Game, such as "Met as
 * Nincada at Route 116", "Evolved into Ninjask", or "Died at level 14 to
 * Roxanne's Nosepass".
 */
export function historyText(
  map: LoadedMap,
  gameId: string,
  pokemon: PokemonState,
  line: HistoryLine
): string {
  const speciesName = (species: string) =>
    getSpecies(map, species)?.name ?? "Unknown Pokémon"

  switch (line.kind) {
    case "encounter": {
      const { encounter } = line
      const where =
        placeName(map, encounter.placeId, gameId) ?? "an unknown location"
      const met = encounter.met
        ? speciesName(encounter.met.species)
        : "Unknown Pokémon"

      if (encounter.origin === "trade") return `Traded for ${met} at ${where}`

      const verb = encounter.origin === "gift" ? "Received" : "Met"
      // The Species met is news only once the Pokémon is another Species.
      const as =
        encounter.met?.species === pokemon.species.species ? "" : ` as ${met}`

      return `${verb}${as} at ${where}`
    }
    case "evolution":
      return `Evolved into ${speciesName(line.line.to.species)}`
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
