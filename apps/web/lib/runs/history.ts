import {
  byTimeOfEntry,
  type EncounterState,
  type EvolutionState,
  type PokemonState,
} from "./state"

/**
 * One line of a Pokémon's History, with its time of entry in epoch
 * milliseconds. History is a view of the record (ADR 0008): a correction to
 * the Encounter or to an evolution line changes its line here.
 */
export type HistoryLine =
  | {
      kind: "encounter"
      id: string
      enteredAt: number
      encounter: EncounterState
    }
  | { kind: "evolution"; id: string; enteredAt: number; line: EvolutionState }
  | {
      kind: "death"
      id: string
      enteredAt: number
      level: number | null
      cause: string | null
    }

/**
 * The History of a Pokémon from its Encounter: the Encounter line, each
 * evolution line, and the death line while it is dead, by time of entry, then
 * id. Renames, moves, and Form changes leave no line.
 */
export function historyOf(
  encounter: EncounterState,
  pokemon: PokemonState
): HistoryLine[] {
  const lines: HistoryLine[] = [
    {
      kind: "encounter",
      id: encounter.id,
      enteredAt: encounter.enteredAt,
      encounter,
    },
    ...pokemon.evolutions.map((line) => ({
      kind: "evolution" as const,
      id: line.id,
      enteredAt: line.enteredAt,
      line,
    })),
  ]

  if (pokemon.diedAt !== null) {
    lines.push({
      kind: "death",
      id: pokemon.id,
      enteredAt: pokemon.diedAt,
      level: pokemon.deathLevel,
      cause: pokemon.deathCause,
    })
  }

  return lines.sort(byTimeOfEntry)
}
