import { eq } from "drizzle-orm"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { runs } from "@/lib/db/schema"
import {
  canonOf,
  insertJourney,
  insertRun,
  makeRun,
  revisionOf,
  saveHouseRules,
  stateColumns,
} from "@/test/runs"
import { signIn } from "@/test/session"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

const acceptedHouseRules = {
  ok: true,
  value: { kind: "accepted", stamp: expect.anything() },
}

async function houseRulesOf(runId: string) {
  return (await canonOf(runId)).value.houseRules
}

describe("House rules", () => {
  test("are saved as typed, line breaks and indentation kept", async () => {
    await signIn()
    const runId = await makeRun()
    const text = "Level caps:\n  Roxanne 15\n\nSet mode, no items in battle.\n"

    await expect(saveHouseRules(runId, text)).resolves.toMatchObject(
      acceptedHouseRules
    )
    await expect(houseRulesOf(runId)).resolves.toBe(text)
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("null clears them", async () => {
    await signIn()
    const runId = await makeRun()

    await saveHouseRules(runId, "Set mode")
    await saveHouseRules(runId, null)

    await expect(houseRulesOf(runId)).resolves.toBeNull()
  })

  test("the text they already have keeps the revision", async () => {
    await signIn()
    const runId = await makeRun()

    await saveHouseRules(runId, "Set mode")
    await expect(saveHouseRules(runId, "Set mode")).resolves.toMatchObject({
      ok: true,
      value: { kind: "accepted" },
    })
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test.each(["active", "waiting", "failed", "complete"] as const)(
    "are accepted on a %s Run",
    async (state) => {
      const playerId = await signIn()
      const runId = await insertRun(stateColumns(state))

      await insertJourney(runId, playerId)

      await expect(saveHouseRules(runId, "Set mode")).resolves.toMatchObject(
        acceptedHouseRules
      )
      await expect(houseRulesOf(runId)).resolves.toBe("Set mode")
    }
  )

  test("2,000 characters are accepted, counted as code points", async () => {
    await signIn()
    const runId = await makeRun()
    const text = "🐉".repeat(2000)

    await expect(saveHouseRules(runId, text)).resolves.toMatchObject(
      acceptedHouseRules
    )
    await expect(houseRulesOf(runId)).resolves.toBe(text)
  })

  test("more than 2,000 characters are refused and write nothing", async () => {
    await signIn()
    const runId = await makeRun()

    await expect(
      saveHouseRules(runId, "a".repeat(2001))
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "invalid-arguments" },
    })
    await expect(houseRulesOf(runId)).resolves.toBeNull()
    await expect(revisionOf(runId)).resolves.toBe(1)
  })

  test("a Player who is not in the Run is denied and writes nothing", async () => {
    await signIn()
    const runId = await makeRun()

    await signIn({ displayName: "Misty" })

    await expect(saveHouseRules(runId, "Set mode")).resolves.toEqual({
      ok: true,
      value: { kind: "denied" },
    })

    const [row] = await db
      .select({ houseRules: runs.houseRules })
      .from(runs)
      .where(eq(runs.id, runId))

    expect(row!.houseRules).toBeNull()
  })
})
