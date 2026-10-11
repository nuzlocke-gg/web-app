import type { EvolutionLineId, SpeciesId } from "@workspace/game-data"

import type { EncounterState, JourneyState, RunState } from "./state"

/**
 * The game-data facts a Rule's check reads, passed in so that every check is
 * a pure function of its arguments.
 */
export type GameFacts = {
  /** The Evolution Line of a Species, or undefined when the game data has none. */
  evolutionLineOf: (species: SpeciesId) => EvolutionLineId | undefined
}

/**
 * One way the Run breaks a Rule, computed and never stored. `encounterId` is
 * the Encounter whose row it marks; a Warning about a Pokémon marks the row
 * of its Encounter.
 */
export type Warning = { journeyId: string; encounterId: string } & (
  | {
      rule: "first-encounter"
      /** The first Encounter of the Journey at the same Place. */
      firstEncounterId: string
    }
  | { rule: "nickname-clause"; pokemonId: string }
  | {
      rule: "duplicate-clause"
      /** The earliest Caught Encounter of the Journey in the same line. */
      earlierEncounterId: string
    }
)

/**
 * A Rule's check: the Warnings the Run gives under it. Pure: it reads only its
 * arguments, so the browser can run it over any Run, including a predicted
 * one.
 */
export type RuleCheck = (run: RunState, facts: GameFacts) => Warning[]

/**
 * First Encounter Rule: each Encounter of a Journey after the first at its
 * Place, whatever its origin or outcome.
 */
export const checkFirstEncounter: RuleCheck = (run) =>
  run.journeys.flatMap((journey) => {
    const firstAt = new Map<string, EncounterState>()

    return journey.encounters.flatMap((encounter): Warning[] => {
      const first = firstAt.get(encounter.placeId)

      if (!first) {
        firstAt.set(encounter.placeId, encounter)

        return []
      }

      return [
        {
          rule: "first-encounter",
          journeyId: journey.id,
          encounterId: encounter.id,
          firstEncounterId: first.id,
        },
      ]
    })
  })

/** Nickname Clause: each living Pokémon, in the Party or the Box, with no nickname. */
export const checkNicknameClause: RuleCheck = (run) =>
  run.journeys.flatMap((journey) =>
    journey.pokemon
      .filter(
        (pokemon) =>
          pokemon.nickname === null &&
          pokemon.diedAt === null &&
          pokemon.removedAt === null
      )
      .map((pokemon): Warning => ({
        rule: "nickname-clause",
        journeyId: journey.id,
        encounterId: pokemon.encounterId,
        pokemonId: pokemon.id,
      }))
  )

/**
 * Duplicate Clause: each Caught Encounter of a Journey whose Species is in the
 * Evolution Line of an earlier Caught Encounter of that Journey. Living, dead,
 * and removed Pokémon all count; a Failed Encounter does not.
 */
export const checkDuplicateClause: RuleCheck = (run, facts) =>
  run.journeys.flatMap((journey) =>
    journey.encounters.flatMap((encounter): Warning[] => {
      if (encounter.outcome !== "caught" || !encounter.met) return []

      const earliest = firstCatchInLine(journey, encounter.met.species, facts)

      if (!earliest || earliest.id === encounter.id) return []

      return [
        {
          rule: "duplicate-clause",
          journeyId: journey.id,
          encounterId: encounter.id,
          earlierEncounterId: earliest.id,
        },
      ]
    })
  )

/**
 * The first Caught Encounter of the Journey, by time of entry, whose Species
 * is in the Evolution Line of `species`; undefined when there is none or the
 * game data has no line for it.
 */
export function firstCatchInLine(
  journey: JourneyState,
  species: SpeciesId,
  facts: GameFacts
): EncounterState | undefined {
  const line = facts.evolutionLineOf(species)

  if (line === undefined) return undefined

  return journey.encounters.find(
    (encounter) =>
      encounter.outcome === "caught" &&
      encounter.met !== null &&
      facts.evolutionLineOf(encounter.met.species) === line
  )
}
