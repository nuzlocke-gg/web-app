import "server-only"

import { matchesPostgresError } from "headcanon/drizzle"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { encounters, pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder, type RunTransaction } from "../binder"
import type { RecordEncounterEffect } from "../changes/record-encounter"
import { passesGameDataGate } from "../game-data-gate"
import { bumpRevision } from "../lock"
import { recordEncounter } from "../mutations"
import { refusal } from "../refusals"
import { clientTime } from "./client-time"
import { admitPlayer, screenPlayer } from "./player-access"

/**
 * Whether a database error is the unique violation of one Encounter per
 * Journey per Slot at a Place of the Map.
 */
export function isSlotTaken(error: unknown): boolean {
  return matchesPostgresError(error, {
    code: "23505",
    constraint: "encounters_journey_place_slot_key",
  })
}

/** Records an Encounter, and its Pokémon when Caught, in the actor's Journey. */
export const recordEncounterBinding = runsBinder.bind(recordEncounter, {
  screen: screenPlayer,
  admit: admitPlayer,
  execute: async ({ tx, state: run, effect, stamp }) => {
    const { gameId } = run.journeys.find(
      (journey) => journey.id === effect.journeyId
    )!
    const known = await passesGameDataGate(run.mapId, gameId, {
      placeId: effect.encounter.placeId,
      form: effect.encounter.met ?? undefined,
    })

    if (!known) return refuseMutation(refusal("unknown-entry"))

    try {
      await writeEffect(tx, run.id, effect)
    } catch (error) {
      // Run no query after this: the failed INSERT aborted the attempt,
      // and the refusal rolls its savepoint back.
      if (isSlotTaken(error)) return refuseMutation(refusal("slot-taken"))

      throw error
    }

    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})

async function writeEffect(
  tx: RunTransaction,
  runId: string,
  effect: RecordEncounterEffect
) {
  const { encounter } = effect

  await tx.insert(encounters).values({
    id: encounter.id,
    runId,
    journeyId: effect.journeyId,
    placeId: encounter.placeId,
    slotOrdinal: encounter.slot,
    origin: encounter.origin,
    outcome: encounter.outcome,
    speciesId: encounter.met?.species ?? null,
    formId: encounter.met?.form ?? null,
    enteredAt: clientTime(encounter.enteredAt),
  })

  if (!effect.pokemon) return

  await tx.insert(pokemon).values({
    id: effect.pokemon.id,
    journeyId: effect.journeyId,
    encounterId: encounter.id,
    speciesId: effect.pokemon.species.species,
    formId: effect.pokemon.species.form,
    nickname: effect.pokemon.nickname,
    inParty: effect.pokemon.inParty,
  })
}
