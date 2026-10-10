import { and, eq, sql } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { v7 as uuidv7 } from "uuid"

import {
  encounters,
  headcanonMutationReceipts,
  journeys,
  runs,
} from "../lib/db/schema.ts"
import { testDb } from "./database.ts"

/**
 * Renames a Run behind the app's back, as another device would: a new name
 * and the next revision. The open tab sees it only after a refresh.
 */
export async function renameRunElsewhere(
  runId: string,
  name: string
): Promise<void> {
  await testDb
    .update(runs)
    .set({
      name,
      revision: sql`${runs.revision} + 1`,
      lastChangedAt: sql`now()`,
    })
    .where(eq(runs.id, runId))
}

/**
 * Makes an Active Emerald Run with a Journey for each Player, behind the
 * app's back. One Player makes a solo Run; two or three make a Soul Link.
 * Returns the Run's id.
 */
export async function insertRunFor(...playerIds: string[]): Promise<string> {
  const id = randomUUID()

  await testDb.insert(runs).values({
    id,
    kind: playerIds.length > 1 ? "soul_link" : "solo",
    state: "active",
    name: "Emerald Hardcore",
    mapId: "emerald",
    rules: {},
    startedAt: new Date(),
    lastChangedAt: new Date(),
    revision: 1,
    chainId: id,
    attemptNumber: 1,
  })

  for (const playerId of playerIds) {
    await testDb
      .insert(journeys)
      .values({ id: randomUUID(), runId: id, playerId, gameId: "emerald" })
  }

  return id
}

/** Marks a Run Failed, or Active again, as another device would. */
export async function setRunStateElsewhere(
  runId: string,
  state: "active" | "failed"
): Promise<void> {
  await testDb
    .update(runs)
    .set({
      state,
      finishedAt: state === "failed" ? new Date() : null,
      revision: sql`${runs.revision} + 1`,
      lastChangedAt: sql`now()`,
    })
    .where(eq(runs.id, runId))
}

/** The Encounters of each Player in a Run, by Slot at the Starter location. */
export async function startersOf(
  runId: string
): Promise<{ playerId: string; slot: number }[]> {
  return testDb
    .select({ playerId: journeys.playerId, slot: encounters.slotOrdinal })
    .from(encounters)
    .innerJoin(journeys, eq(journeys.id, encounters.journeyId))
    .where(and(eq(encounters.runId, runId), eq(encounters.placeId, "starter")))
    .orderBy(encounters.slotOrdinal)
}

/** Deletes a change's receipt, as the daily cleanup does after 7 days. */
export async function deleteReceipt(mutationId: string): Promise<void> {
  await testDb
    .delete(headcanonMutationReceipts)
    .where(eq(headcanonMutationReceipts.mutationId, mutationId))
}

/**
 * Records a Failed Encounter with no Species at each Place for a Player,
 * behind the app's back, a minute apart and in the order given, the last
 * one a minute ago.
 */
export async function recordFailedEncountersElsewhere(
  runId: string,
  playerId: string,
  placeIds: string[]
): Promise<void> {
  const [journey] = await testDb
    .select({ id: journeys.id })
    .from(journeys)
    .where(and(eq(journeys.runId, runId), eq(journeys.playerId, playerId)))
  const minute = 60_000
  const start = Date.now() - placeIds.length * minute

  await testDb.insert(encounters).values(
    placeIds.map((placeId, index) => ({
      id: uuidv7(),
      runId,
      journeyId: journey!.id,
      placeId,
      slotOrdinal: 1,
      origin: "wild" as const,
      outcome: "failed" as const,
      enteredAt: new Date(start + index * minute),
    }))
  )
}
