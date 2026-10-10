import "server-only"

import { and, eq, sql } from "drizzle-orm"
import { matchesPostgresError } from "headcanon/drizzle"
import {
  acceptMutation,
  allowAdmission,
  allowScreening,
  denyMutation,
  refuseMutation,
} from "headcanon/server"

import { db } from "@/lib/db"
import { encounters, journeys, pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder, type RunTransaction } from "../binder"
import { readRunState } from "../canon"
import * as recordEncounterChange from "../changes/record-encounter"
import { passesGameDataGate } from "../game-data-gate"
import { bumpRevision, lockRun } from "../lock"
import { recordEncounter } from "../mutations"
import { refusal } from "../refusals"

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

/**
 * Records an Encounter in the actor's Journey. Membership is checked before
 * the transaction and again under the Run lock; the shared `check` then
 * decides the change over the locked Run, the game-data gate checks its
 * Place and Species, and the rows are written from the Effect.
 */
export const recordEncounterBinding = runsBinder.bind(recordEncounter, {
  screen: async ({ actor, args }) => {
    const [membership] = await db
      .select({ id: journeys.id })
      .from(journeys)
      .where(and(eq(journeys.runId, args.runId), eq(journeys.playerId, actor)))

    return membership ? allowScreening() : denyMutation()
  },
  admit: async ({ tx, actor, args }) => {
    const row = await lockRun(tx, args.runId)
    const run = row && (await readRunState(tx, row, actor))

    return run ? allowAdmission({ run }) : denyMutation()
  },
  execute: async ({ tx, args, evidence, stamp }) => {
    const { run } = evidence
    const checked = recordEncounterChange.check(run, args)

    if (!checked.ok) return refuseMutation(checked.error)

    const effect = checked.value
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
  effect: recordEncounterChange.RecordEncounterEffect
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
    // The client's clock, but never later than the server's; whole
    // milliseconds, as the state keeps it.
    enteredAt: sql`least(
      timestamptz 'epoch' + ${encounter.enteredAt}::float8 * interval '1 millisecond',
      date_trunc('milliseconds', now())
    )`,
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
