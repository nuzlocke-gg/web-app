import type { FormRef, Origin, PlaceId } from "@workspace/game-data"

// The alternatives are the database enums too (lib/db/schema.ts), so each list
// has one home. Values are only ever added, so a row can hold a value that a
// build older than its writer does not know (ADR 0003); the state reads it as
// null, and nothing writes a null back.

/** Solo or Soul Link, fixed at creation (ADR 0004). */
export const runKinds = ["solo", "soul_link"] as const
export type RunKind = (typeof runKinds)[number]

/** Where a Run is in its life. */
export const runLifeStates = [
  "waiting",
  "active",
  "failed",
  "complete",
] as const
export type RunLifeState = (typeof runLifeStates)[number]

/** Who can read a Run: its Players only, or anyone with its link. */
export const runVisibilities = ["private", "link"] as const
export type RunVisibility = (typeof runVisibilities)[number]

/** Whether an Encounter gave a Pokémon. */
export const encounterOutcomes = ["caught", "failed"] as const
export type EncounterOutcome = (typeof encounterOutcomes)[number]

/**
 * Reads a stored enum value leniently: the value when this build knows it,
 * else null, so the screen shows it as unknown instead of failing.
 * @example
 * parseKnown(runKinds, row.kind) // "solo", or null for a newer kind
 */
export function parseKnown<const Values extends readonly string[]>(
  values: Values,
  stored: string
): Values[number] | null {
  return values.find((value) => value === stored) ?? null
}

/** The most Pokémon a Party holds. */
export const PARTY_SIZE = 6

/** One Encounter of a Journey, in a Slot at a Place. */
export type EncounterState = {
  id: string
  placeId: PlaceId
  /** The Slot's ordinal at its Place, from 1. */
  slot: number
  /** Null when a newer build stored it. */
  origin: Origin | null
  /** Null when a newer build stored it. */
  outcome: EncounterOutcome | null
  /** The Species and Form met. Null only on a Failed Encounter. */
  met: FormRef | null
  /** When the player recorded it, in epoch milliseconds. */
  enteredAt: number
}

/** One Pokémon of a Journey, from one Caught Encounter. */
export type PokemonState = {
  id: string
  encounterId: string
  /** The current Species and Form. */
  species: FormRef
  nickname: string | null
  /** In the Party, else in the Box; kept as it was at death. */
  inParty: boolean
  /** Epoch milliseconds, or null while it lives. */
  diedAt: number | null
  /** The level it died at, when the player gave one. */
  deathLevel: number | null
  /** Epoch milliseconds when traded away or released, or null. */
  removedAt: number | null
}

/** One Player's part of a Run, with its Encounters in order of entry. */
export type JourneyState = {
  id: string
  playerId: string
  gameId: string
  encounters: EncounterState[]
  /** In the order of their Encounters. */
  pokemon: PokemonState[]
}

/**
 * The canon of `run.v1`: one Run as its screens need it, read for one viewer.
 * The loader makes it; the Run root predicts over it.
 */
export type RunState = {
  id: string
  /** The Player who reads this canon. It keys the root's stored queue. */
  viewerId: string
  name: string
  mapId: string
  /** Null when a newer build stored it; so are `state` and `visibility`. */
  kind: RunKind | null
  /** Null reads as a Run that admits no change. */
  state: RunLifeState | null
  visibility: RunVisibility | null
  attemptNumber: number
  /** `{ ruleId: on }`; an absent key is Off. */
  rules: Record<string, boolean>
  journeys: JourneyState[]
}

/** The viewer's own Journey. Every canon is read for a Player of the Run. */
export function viewerJourney(run: RunState): JourneyState {
  const journey = run.journeys.find(
    (candidate) => candidate.playerId === run.viewerId
  )

  if (!journey) throw new Error(`Run ${run.id} has no Journey for its viewer`)

  return journey
}

/** One Encounter of the viewer's Journey, with that Journey. */
export type ViewerEncounter = {
  journey: JourneyState
  encounter: EncounterState
}

/**
 * The viewer's Encounter with this id, or undefined when the viewer's Journey
 * has none: it was removed, or it is a partner's.
 */
export function findViewerEncounter(
  run: RunState,
  encounterId: string
): ViewerEncounter | undefined {
  const journey = viewerJourney(run)
  const encounter = journey.encounters.find(
    (candidate) => candidate.id === encounterId
  )

  return encounter && { journey, encounter }
}

/** The living Pokémon of a Journey that the player carries. */
export function partyOf(journey: JourneyState): PokemonState[] {
  return journey.pokemon.filter(
    (pokemon) =>
      pokemon.inParty && pokemon.diedAt === null && pokemon.removedAt === null
  )
}

/** The living Pokémon of a Journey that are not in the Party. */
export function boxOf(journey: JourneyState): PokemonState[] {
  return journey.pokemon.filter(
    (pokemon) =>
      !pokemon.inParty && pokemon.diedAt === null && pokemon.removedAt === null
  )
}

/** The dead Pokémon of a Journey. */
export function graveyardOf(journey: JourneyState): PokemonState[] {
  return journey.pokemon.filter(
    (pokemon) => pokemon.diedAt !== null && pokemon.removedAt === null
  )
}
