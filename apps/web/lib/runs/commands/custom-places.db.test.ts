import { loadMap } from "@workspace/game-data"
import { eq } from "drizzle-orm"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { customPlaces, encounters } from "@/lib/db/schema"
import {
  accepted,
  addCustomPlaceOf,
  canonOf,
  caughtMudkipArgs,
  insertJourney,
  insertRun,
  journeyOf,
  makeRun,
  record,
  refused,
  removeCustomPlaceOf,
  renameCustomPlaceOf,
  revisionOf,
  stateColumns,
} from "@/test/runs"
import { signIn } from "@/test/session"

import {
  addCustomPlace,
  removeCustomPlace,
  renameCustomPlace,
} from "../mutations"
import type { PlaceRef } from "../place"
import { computeWarnings, gameFactsOf } from "../warnings"
import { isCustomPlaceNameTaken } from "./custom-place-errors"
import { isSlotTaken } from "./record-encounter"
import { isCustomPlaceInUse } from "./remove-custom-place"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

/** Adds a Custom Place through the action and returns its id. */
async function addThrough(runId: string, name: string): Promise<string> {
  const customPlaceId = uuidv7()

  await expect(
    addCustomPlaceOf({ runId, customPlaceId, name })
  ).resolves.toEqual(accepted)

  return customPlaceId
}

/** Writes a Custom Place as another player's device did, past this one's canon. */
async function addElsewhere(runId: string, name: string): Promise<string> {
  const id = uuidv7()

  await db.insert(customPlaces).values({ id, runId, name })

  return id
}

/** Writes a partner's Encounter at a Custom Place, past this player's canon. */
async function encounterElsewhere(
  runId: string,
  journeyId: string,
  customPlaceId: string
) {
  await db.insert(encounters).values({
    id: uuidv7(),
    runId,
    journeyId,
    customPlaceId,
    slotOrdinal: 1,
    origin: "trade",
    outcome: "failed",
    enteredAt: new Date(),
  })
}

/** Ash's Soul Link Run with Misty, signed in as Ash. */
async function soulLinkWithMisty() {
  const mistyId = await signIn({ displayName: "Misty" })
  const ashId = await signIn()
  const runId = await insertRun({ kind: "soul_link" })

  await insertJourney(runId, ashId)

  return { runId, mistyJourneyId: await insertJourney(runId, mistyId) }
}

function custom(id: string): PlaceRef {
  return { kind: "custom", id }
}

async function customPlacesOf(runId: string) {
  return (await canonOf(runId)).value.customPlaces
}

describe("Add a Custom Place", () => {
  test("adds the Custom Place to the Run and bumps the revision", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")

    await expect(customPlacesOf(runId)).resolves.toEqual([
      { id, name: "Link trade" },
    ])
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("the predictor and the server give the same Run", async () => {
    await signIn()
    const runId = await makeRun()
    const before = await canonOf(runId)
    const args = { runId, customPlaceId: uuidv7(), name: "Link trade" }
    const predicted = addCustomPlace.predict(before.value, args, {
      mutationId: uuidv7(),
    })

    await addCustomPlaceOf(args)

    expect(predicted).toEqual(ok((await canonOf(runId)).value))
  })

  test("a name the Run has in any letter case is refused as custom-place-name-taken by prediction, replay, and server", async () => {
    await signIn()
    const runId = await makeRun()
    const stale = await canonOf(runId)
    const args = { runId, customPlaceId: uuidv7(), name: "LINK TRADE" }
    const predict = (value: typeof stale.value) =>
      addCustomPlace.predict(value, args, { mutationId: uuidv7() })

    expect(predict(stale.value).ok).toBe(true)

    await addElsewhere(runId, "Link trade")

    const taken = { ok: false, error: { kind: "custom-place-name-taken" } }
    const replayed = await canonOf(runId)

    expect(predict(replayed.value)).toEqual(taken)
    await expect(addCustomPlaceOf(args)).resolves.toEqual(
      refused("custom-place-name-taken")
    )
    await expect(customPlacesOf(runId)).resolves.toHaveLength(1)
  })

  test.each(["waiting", "failed", "complete"] as const)(
    "a %s Run refuses it as run-not-active",
    async (state) => {
      const playerId = await signIn()
      const runId = await insertRun(stateColumns(state))

      await insertJourney(runId, playerId)

      await expect(
        addCustomPlaceOf({ runId, customPlaceId: uuidv7(), name: "Link" })
      ).resolves.toEqual(refused("run-not-active"))
    }
  )
})

describe("Rename a Custom Place", () => {
  test("renames a Custom Place that has an Encounter", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")

    await expect(
      record(caughtMudkipArgs(runId, { place: custom(id) }))
    ).resolves.toEqual(accepted)
    await expect(
      renameCustomPlaceOf({ runId, customPlaceId: id, name: "Trade from Ruby" })
    ).resolves.toEqual(accepted)
    await expect(customPlacesOf(runId)).resolves.toEqual([
      { id, name: "Trade from Ruby" },
    ])
    expect((await journeyOf(runId)).encounters[0]!.place).toEqual(custom(id))
  })

  test("a new letter case of its own name is accepted", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")

    await expect(
      renameCustomPlaceOf({ runId, customPlaceId: id, name: "Link Trade" })
    ).resolves.toEqual(accepted)
    await expect(customPlacesOf(runId)).resolves.toEqual([
      { id, name: "Link Trade" },
    ])
  })

  test("the name it already has is accepted with no new revision", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")

    await expect(
      renameCustomPlaceOf({ runId, customPlaceId: id, name: "Link trade" })
    ).resolves.toEqual(accepted)
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("another Custom Place's name is refused as custom-place-name-taken by prediction, replay, and server", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")
    const stale = await canonOf(runId)
    const args = { runId, customPlaceId: id, name: "bonus disc" }
    const predict = (value: typeof stale.value) =>
      renameCustomPlace.predict(value, args, { mutationId: uuidv7() })

    expect(predict(stale.value).ok).toBe(true)

    await addElsewhere(runId, "Bonus disc")

    const taken = { ok: false, error: { kind: "custom-place-name-taken" } }

    expect(predict((await canonOf(runId)).value)).toEqual(taken)
    await expect(renameCustomPlaceOf(args)).resolves.toEqual(
      refused("custom-place-name-taken")
    )
  })
})

describe("Remove a Custom Place", () => {
  test("removes a Custom Place with no Encounter", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")

    await expect(
      removeCustomPlaceOf({ runId, customPlaceId: id })
    ).resolves.toEqual(accepted)
    await expect(customPlacesOf(runId)).resolves.toEqual([])
  })

  test("a partner's Encounter there refuses it as custom-place-in-use by prediction, replay, and server", async () => {
    const { runId, mistyJourneyId } = await soulLinkWithMisty()
    const id = await addThrough(runId, "Link trade")
    const stale = await canonOf(runId)
    const args = { runId, customPlaceId: id }
    const predict = (value: typeof stale.value) =>
      removeCustomPlace.predict(value, args, { mutationId: uuidv7() })

    expect(predict(stale.value).ok).toBe(true)

    await encounterElsewhere(runId, mistyJourneyId, id)

    const inUse = { ok: false, error: { kind: "custom-place-in-use" } }

    expect(predict((await canonOf(runId)).value)).toEqual(inUse)
    await expect(removeCustomPlaceOf(args)).resolves.toEqual(
      refused("custom-place-in-use")
    )
    await expect(customPlacesOf(runId)).resolves.toHaveLength(1)
  })
})

describe("Record an Encounter at a Custom Place", () => {
  test("passes the game-data gate and reads back at its Custom Place", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")

    await expect(
      record(caughtMudkipArgs(runId, { place: custom(id), origin: "trade" }))
    ).resolves.toEqual(accepted)
    expect((await journeyOf(runId)).encounters[0]!.place).toEqual(custom(id))
  })

  test("still refuses a Species the Game does not have as unknown-entry", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")
    const args = caughtMudkipArgs(runId, {
      place: custom(id),
      outcome: {
        kind: "failed",
        met: { species: "pikachu-galar", form: "base" },
      },
    })

    await expect(record(args)).resolves.toEqual(refused("unknown-entry"))
  })

  test("a removed Custom Place is refused as gone", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")

    await removeCustomPlaceOf({ runId, customPlaceId: id })

    await expect(
      record(caughtMudkipArgs(runId, { place: custom(id) }))
    ).resolves.toEqual(refused("gone"))
  })

  test("two Encounters there give a First Encounter Warning", async () => {
    await signIn()
    const runId = await makeRun()
    const id = await addThrough(runId, "Link trade")

    for (const slot of [1, 2]) {
      await expect(
        record(caughtMudkipArgs(runId, { place: custom(id), slot }))
      ).resolves.toEqual(accepted)
    }

    const run = (await canonOf(runId)).value
    const warnings = computeWarnings(
      { ...run, rules: { "first-encounter": true } },
      gameFactsOf((await loadMap("emerald"))!)
    )

    expect(warnings.map((warning) => warning.rule)).toEqual(["first-encounter"])
  })
})

describe("the database's backstops", () => {
  async function runWithJourney() {
    const playerId = await signIn()
    const runId = await insertRun()

    return { runId, journeyId: await insertJourney(runId, playerId) }
  }

  test("isCustomPlaceNameTaken matches a second name in another letter case, and no other error", async () => {
    const { runId } = await runWithJourney()
    const id = await addElsewhere(runId, "Link trade")

    const nameError = await addElsewhere(runId, "LINK TRADE").catch(
      (error: unknown) => error
    )
    const idError = await db
      .insert(customPlaces)
      .values({ id, runId, name: "Other" })
      .catch((error: unknown) => error)

    expect(isCustomPlaceNameTaken(nameError)).toBe(true)
    expect(isCustomPlaceNameTaken(idError)).toBe(false)
  })

  test("isCustomPlaceInUse matches the foreign key that keeps a Custom Place with an Encounter", async () => {
    const { runId, journeyId } = await runWithJourney()
    const id = await addElsewhere(runId, "Link trade")

    await encounterElsewhere(runId, journeyId, id)

    const error = await db
      .delete(customPlaces)
      .where(eq(customPlaces.id, id))
      .catch((caught: unknown) => caught)

    expect(isCustomPlaceInUse(error)).toBe(true)
  })

  test("isSlotTaken matches a second Encounter in one Slot at a Custom Place", async () => {
    const { runId, journeyId } = await runWithJourney()
    const id = await addElsewhere(runId, "Link trade")

    await encounterElsewhere(runId, journeyId, id)

    const error = await encounterElsewhere(runId, journeyId, id).catch(
      (caught: unknown) => caught
    )

    expect(isSlotTaken(error)).toBe(true)
  })
})
