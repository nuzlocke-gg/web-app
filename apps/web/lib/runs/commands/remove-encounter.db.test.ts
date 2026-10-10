import { eq } from "drizzle-orm"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { encounters, pokemon } from "@/lib/db/schema"
import {
  accepted,
  canonOf,
  caughtMudkipArgs,
  denied,
  insertJourney,
  insertRun,
  journeyOf,
  makeRun,
  record,
  refused,
  remove,
  revisionOf,
} from "@/test/runs"
import { signIn } from "@/test/session"

import { removeEncounter } from "../mutations"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

describe("Remove an Encounter", () => {
  test("removes the Encounter and its Pokémon, bumps the revision, and empties the Slot", async () => {
    await signIn()
    const runId = await makeRun()
    const mudkip = caughtMudkipArgs(runId)
    const { pokemonId } = mudkip.outcome as { pokemonId: string }

    await record(mudkip)

    await expect(
      remove({ runId, encounterId: mudkip.encounterId })
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.encounters).toEqual([])
    expect(journey.pokemon).toEqual([])
    // The loader joins Pokémon to their Encounters, so it cannot see an
    // orphan; the table must not hold one.
    await expect(
      db.select().from(pokemon).where(eq(pokemon.id, pokemonId))
    ).resolves.toEqual([])
    await expect(revisionOf(runId)).resolves.toBe(3)

    await expect(record(caughtMudkipArgs(runId))).resolves.toEqual(accepted)
  })

  test("a fresh removal of a removed Encounter is refused as gone", async () => {
    await signIn()
    const runId = await makeRun()
    const mudkip = caughtMudkipArgs(runId)
    const removal = { runId, encounterId: mudkip.encounterId }

    await record(mudkip)
    await remove(removal)

    await expect(remove(removal)).resolves.toEqual(refused("gone"))
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("an Encounter of another Player's Journey is denied and writes nothing", async () => {
    const ashId = await signIn()
    const runId = await insertRun({ kind: "soul_link" })
    const ashJourneyId = await insertJourney(runId, ashId)
    const encounterId = uuidv7()

    await db.insert(encounters).values({
      id: encounterId,
      runId,
      journeyId: ashJourneyId,
      placeId: "starter",
      slotOrdinal: 1,
      origin: "gift",
      outcome: "failed",
      enteredAt: new Date(),
    })

    const mistyId = await signIn({ displayName: "Misty" })

    await insertJourney(runId, mistyId)

    await expect(remove({ runId, encounterId })).resolves.toEqual(denied)
    await expect(
      db.select().from(encounters).where(eq(encounters.id, encounterId))
    ).resolves.toHaveLength(1)
  })

  test("the predictor and the server give the same Run", async () => {
    await signIn()
    const runId = await makeRun()
    const first = caughtMudkipArgs(runId)
    const second = caughtMudkipArgs(runId, { slot: 2 })

    await record(first)
    await record(second)

    const before = await canonOf(runId)
    const args = { runId, encounterId: first.encounterId }
    const predicted = removeEncounter.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await remove(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
