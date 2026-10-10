import { ORIGINS, type Origin, type PlaceId } from "@workspace/game-data"
import { produce, type Draft } from "immer"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { nickname } from "../nickname"
import { refusal, type RunRefusal } from "../refusals"
import {
  byTimeOfEntry,
  partyOf,
  PARTY_SIZE,
  viewerJourney,
  type EncounterOutcome,
  type EncounterState,
  type JourneyState,
  type PokemonState,
  type RunState,
} from "../state"
import { journeyOf } from "./drafts"
import { formRefArgs } from "./form-ref"

/**
 * The arguments of Record an Encounter, in parsed form. Everything random or
 * clock-based is chosen once, when the player saves: the ids are UUID v7, and
 * `enteredAt` is the client clock in epoch milliseconds (the server stores
 * the earlier of it and its own clock). The Journey is the actor's own.
 */
export const recordEncounterArgs = z.object({
  runId: z.uuid(),
  encounterId: z.uuidv7(),
  placeId: z.string().min(1),
  /** {@link nextSlot} for a new Slot; an existing Slot's ordinal to fill it. */
  slot: z.int().min(1),
  origin: z.enum(ORIGINS),
  enteredAt: z.int().nonnegative(),
  outcome: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("caught"),
      met: formRefArgs,
      pokemonId: z.uuidv7(),
      nickname: nickname.optional(),
      /** The Box when the Party is full, whatever this says. */
      goesTo: z.enum(["party", "box"]),
    }),
    z.object({ kind: z.literal("failed"), met: formRefArgs.optional() }),
  ]),
})

/** The arguments of Record an Encounter. */
export type RecordEncounterArgs = z.infer<typeof recordEncounterArgs>

/** The Refusals that {@link check} gives. */
export type RecordEncounterRefusal = RunRefusal<"run-not-active" | "slot-taken">

/** What Record an Encounter adds: the Encounter and, when Caught, its Pokémon. */
export type RecordEncounterEffect = {
  journeyId: string
  /** Every value comes from the parsed args, so the command writes no null. */
  encounter: EncounterState & { origin: Origin; outcome: EncounterOutcome }
  pokemon: PokemonState | null
}

/**
 * Decides Record an Encounter for the viewer's Journey: refused on a Run that
 * is not Active and on a Slot the Journey already has. A catch meant for a
 * full Party goes to the Box.
 */
export function check(
  run: RunState,
  args: RecordEncounterArgs
): Result<RecordEncounterEffect, RecordEncounterRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const journey = viewerJourney(run)
  const slotTaken = journey.encounters.some(
    (encounter) =>
      encounter.placeId === args.placeId && encounter.slot === args.slot
  )

  if (slotTaken) return err(refusal("slot-taken"))

  const { outcome } = args
  const encounter: RecordEncounterEffect["encounter"] = {
    id: args.encounterId,
    placeId: args.placeId,
    slot: args.slot,
    origin: args.origin,
    outcome: outcome.kind,
    met: outcome.met ?? null,
    enteredAt: args.enteredAt,
  }

  if (outcome.kind === "failed") {
    return ok({ journeyId: journey.id, encounter, pokemon: null })
  }

  const partyHasRoom = partyOf(journey).length < PARTY_SIZE

  return ok({
    journeyId: journey.id,
    encounter,
    pokemon: {
      id: outcome.pokemonId,
      encounterId: args.encounterId,
      species: outcome.met,
      nickname: outcome.nickname ?? null,
      inParty: outcome.goesTo === "party" && partyHasRoom,
      diedAt: null,
      deathLevel: null,
      deathCause: null,
      removedAt: null,
      evolutions: [],
    },
  })
}

/**
 * Adds the Encounter and its Pokémon to their Journey, in the order the
 * canon loader reads them: Encounters by time of entry, then id; Pokémon in
 * the order of their Encounters.
 */
export function apply(run: RunState, effect: RecordEncounterEffect): RunState {
  return produce(run, (draft) => {
    const journey = journeyOf(draft, effect.journeyId)

    journey.encounters.push(effect.encounter)
    journey.encounters.sort(byTimeOfEntry)

    if (!effect.pokemon) return

    journey.pokemon.push(effect.pokemon)
    sortInEncounterOrder(journey)
  })
}

function sortInEncounterOrder(journey: Draft<JourneyState>): void {
  const position = new Map(
    journey.encounters.map((encounter, index) => [encounter.id, index])
  )

  journey.pokemon.sort(
    (a, b) => position.get(a.encounterId)! - position.get(b.encounterId)!
  )
}

/**
 * The ordinal of a new Slot at a Place: one past the highest Slot any Journey
 * of the Run has there, so partners who open a new Slot at once share it.
 */
export function nextSlot(run: RunState, placeId: PlaceId): number {
  const slots = run.journeys.flatMap((journey) =>
    journey.encounters
      .filter((encounter) => encounter.placeId === placeId)
      .map((encounter) => encounter.slot)
  )

  return Math.max(0, ...slots) + 1
}
