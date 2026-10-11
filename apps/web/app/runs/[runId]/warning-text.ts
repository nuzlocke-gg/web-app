import { placeName, type LoadedMap } from "@workspace/game-data"

import { speciesName } from "@/components/species-name"
import type { Warning } from "@/lib/runs/rule-checks"
import { ruleName } from "@/lib/runs/rules"
import type { EncounterState, JourneyState, RunState } from "@/lib/runs/state"

/** What a Warning says. */
export type WarningText = {
  /** The name of the Rule it breaks. */
  rule: string
  /** What breaks it, as a sentence. */
  text: string
  /** The location of the row it marks. */
  where: string
}

/**
 * Where a Warning shows: on the Run (the dock, a Pokémon screen), or before
 * a save in the record Drawer, where the Pokémon is not yet named.
 */
export type WarningPhrasing = "run" | "record"

/**
 * What a Warning says, from the Run it was computed on: in the record Drawer,
 * that is the predicted Run, which has the new Encounter.
 * @example
 * warningText(map, run, warning)
 * // { rule: "Duplicate Clause", where: "Route 103",
 * //   text: "Poochyena is in the same evolution line as Fang (Route 101)." }
 */
export function warningText(
  map: LoadedMap,
  run: RunState,
  warning: Warning,
  phrasing: WarningPhrasing = "run"
): WarningText {
  const journey = journeyOf(run, warning.journeyId)
  const encounter = encounterOf(journey, warning.encounterId)
  const where = locationOf(map, journey, encounter)
  const rule = ruleName(warning.rule)

  switch (warning.rule) {
    case "first-encounter": {
      const first = encounterOf(journey, warning.firstEncounterId)

      return {
        rule,
        where,
        text: first.met
          ? `${where} already has an encounter: ${speciesName(map, first.met.species)}.`
          : `${where} already has an encounter.`,
      }
    }
    case "duplicate-clause": {
      const earlier = encounterOf(journey, warning.earlierEncounterId)

      return {
        rule,
        where,
        text: `${metName(map, encounter)} is in the same evolution line as ${encounterLabel(map, journey, earlier)} (${locationOf(map, journey, earlier)}).`,
      }
    }
    case "nickname-clause": {
      const pokemon = journey.pokemon.find(
        (candidate) => candidate.id === warning.pokemonId
      )
      const name = pokemon
        ? speciesName(map, pokemon.species.species)
        : metName(map, encounter)

      return {
        rule,
        where,
        text:
          phrasing === "record"
            ? "It has no nickname yet."
            : `${name} has no nickname.`,
      }
    }
  }
}

/**
 * What the screens call the Pokémon of a Caught Encounter: its nickname, else
 * the Species met.
 * @example
 * `Same line as ${encounterLabel(map, journey, earlier)}` // "Same line as Fang"
 */
export function encounterLabel(
  map: LoadedMap,
  journey: JourneyState,
  encounter: EncounterState
): string {
  const pokemon = journey.pokemon.find(
    (candidate) => candidate.encounterId === encounter.id
  )

  return pokemon?.nickname ?? metName(map, encounter)
}

function metName(map: LoadedMap, encounter: EncounterState): string {
  return encounter.met
    ? speciesName(map, encounter.met.species)
    : "Species unknown"
}

function locationOf(
  map: LoadedMap,
  journey: JourneyState,
  encounter: EncounterState
): string {
  return placeName(map, encounter.placeId, journey.gameId) ?? "Unknown location"
}

// A Warning names only the Journey, Encounters, and Pokémon of the Run it was
// computed on, so these lookups throw when it does not.

function journeyOf(run: RunState, journeyId: string): JourneyState {
  const journey = run.journeys.find((candidate) => candidate.id === journeyId)

  if (!journey) throw new Error(`Run ${run.id} has no Journey ${journeyId}`)

  return journey
}

function encounterOf(
  journey: JourneyState,
  encounterId: string
): EncounterState {
  const encounter = journey.encounters.find(
    (candidate) => candidate.id === encounterId
  )

  if (!encounter) {
    throw new Error(`Journey ${journey.id} has no Encounter ${encounterId}`)
  }

  return encounter
}
