import { eq } from "drizzle-orm"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { encounters, pokemon, runs } from "@/lib/db/schema"
import {
  accepted,
  canonOf,
  caughtMudkipArgs,
  correct,
  denied,
  insertJourney,
  insertRun,
  journeyOf,
  makeRun,
  record,
  refused,
  remove,
  revisionOf,
  runWithMudkip,
} from "@/test/runs"
import { signIn } from "@/test/session"

import type { CorrectEncounterArgs } from "../changes/correct-encounter"
import type { RecordEncounterArgs } from "../changes/record-encounter"
import { correctEncounter } from "../mutations"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

const torchic = { species: "torchic", form: "base" }

/** The arguments that correct a recorded Encounter, as recorded unless overridden. */
function correction(
  recorded: RecordEncounterArgs,
  overrides: Partial<CorrectEncounterArgs> = {}
): CorrectEncounterArgs {
  return {
    runId: recorded.runId,
    encounterId: recorded.encounterId,
    met: recorded.outcome.met ?? null,
    origin: recorded.origin,
    ...overrides,
  }
}

describe("Correct an Encounter", () => {
  test("a new Species met updates a Pokémon that has not evolved and bumps the revision", async () => {
    const { runId, mudkip } = await runWithMudkip()

    await expect(
      correct(correction(mudkip, { met: torchic, origin: "wild" }))
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.encounters[0]).toMatchObject({
      met: torchic,
      origin: "wild",
      outcome: "caught",
    })
    expect(journey.pokemon[0]!.species).toEqual(torchic)
    await expect(revisionOf(runId)).resolves.toBe(3)
  })

  test("a new Species met leaves a Pokémon that evolved", async () => {
    const { runId, mudkip } = await runWithMudkip()
    const marshtomp = { species: "marshtomp", form: "base" }

    await db
      .update(pokemon)
      .set({ speciesId: marshtomp.species })
      .where(eq(pokemon.encounterId, mudkip.encounterId))

    await expect(
      correct(correction(mudkip, { met: torchic }))
    ).resolves.toEqual(accepted)

    const journey = await journeyOf(runId)

    expect(journey.encounters[0]!.met).toEqual(torchic)
    expect(journey.pokemon[0]!.species).toEqual(marshtomp)
  })

  test("a Failed Encounter's Species can be set and cleared", async () => {
    await signIn()
    const runId = await makeRun()
    const failed = caughtMudkipArgs(runId, { outcome: { kind: "failed" } })

    await record(failed)

    await expect(
      correct(correction(failed, { met: torchic }))
    ).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).encounters[0]!.met).toEqual(torchic)

    await expect(correct(correction(failed, { met: null }))).resolves.toEqual(
      accepted
    )

    const journey = await journeyOf(runId)

    expect(journey.encounters[0]!.met).toBeNull()
    expect(journey.encounters[0]!.outcome).toBe("failed")
    expect(journey.pokemon).toEqual([])
  })

  test("a correction to the values already held is accepted unchanged and keeps the revision", async () => {
    const { runId, mudkip } = await runWithMudkip()

    await expect(correct(correction(mudkip))).resolves.toEqual(accepted)
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("a fresh correction of a removed Encounter is refused as gone", async () => {
    const { mudkip } = await runWithMudkip()

    await remove({ runId: mudkip.runId, encounterId: mudkip.encounterId })

    await expect(
      correct(correction(mudkip, { met: torchic }))
    ).resolves.toEqual(refused("gone"))
  })

  test("a Species the Map does not have is refused as unknown-entry", async () => {
    const { runId, mudkip } = await runWithMudkip()

    await expect(
      correct(correction(mudkip, { met: { species: "pikachu", form: "x" } }))
    ).resolves.toEqual(refused("unknown-entry"))
    expect((await journeyOf(runId)).encounters[0]!.met).toEqual(
      mudkip.outcome.met
    )
  })

  test("a Finished Run refuses it as run-not-active", async () => {
    const { runId, mudkip } = await runWithMudkip()

    await db
      .update(runs)
      .set({ state: "complete", finishedAt: new Date() })
      .where(eq(runs.id, runId))

    await expect(
      correct(correction(mudkip, { met: torchic }))
    ).resolves.toEqual(refused("run-not-active"))
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

    await expect(
      correct({ runId, encounterId, met: torchic, origin: "gift" })
    ).resolves.toEqual(denied)

    const [row] = await db
      .select({ speciesId: encounters.speciesId })
      .from(encounters)
      .where(eq(encounters.id, encounterId))

    expect(row!.speciesId).toBeNull()
    await expect(revisionOf(runId)).resolves.toBe(1)
  })

  test("the predictor and the server give the same Run", async () => {
    const { runId, mudkip } = await runWithMudkip()
    const before = await canonOf(runId)
    const args = correction(mudkip, { met: torchic, origin: "trade" })
    const predicted = correctEncounter.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await correct(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })
})
