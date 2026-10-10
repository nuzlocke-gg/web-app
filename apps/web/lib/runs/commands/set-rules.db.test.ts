import { eq } from "drizzle-orm"
import { describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { runs } from "@/lib/db/schema"
import {
  accepted,
  canonOf,
  denied,
  insertJourney,
  insertRun,
  makeRun,
  refused,
  revisionOf,
  setRulesOf,
  stateColumns,
  waitUntilBlocking,
} from "@/test/runs"
import { signIn } from "@/test/session"

import { lockRun } from "../lock"
import { defaultRules } from "../rules"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
// The action expires the axis cache tag and refreshes the route, which work
// only inside a request.
vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),
  refresh: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))

async function rulesOf(runId: string) {
  return (await canonOf(runId)).value.rules
}

describe("Set the Rules", () => {
  test("sets the changed Rule, keeps the others, and bumps the revision", async () => {
    await signIn()
    const runId = await makeRun()

    await expect(
      setRulesOf({ runId, rules: { "duplicate-clause": true } })
    ).resolves.toEqual(accepted)
    await expect(rulesOf(runId)).resolves.toEqual({
      ...defaultRules(),
      "duplicate-clause": true,
    })
    await expect(revisionOf(runId)).resolves.toBe(2)
  })

  test("a value already set is accepted unchanged and keeps the revision", async () => {
    await signIn()
    const runId = await makeRun()

    await expect(
      setRulesOf({ runId, rules: { "first-encounter": true } })
    ).resolves.toEqual(accepted)
    await expect(revisionOf(runId)).resolves.toBe(1)
  })

  test("keeps a stored Rule this build does not know", async () => {
    const playerId = await signIn()
    const runId = await insertRun({ rules: { "level-cap": true } })

    await insertJourney(runId, playerId)

    await setRulesOf({ runId, rules: { whiteout: true } })

    await expect(rulesOf(runId)).resolves.toEqual({
      "level-cap": true,
      whiteout: true,
    })
  })

  test("the Shared Duplicate Clause turns the Duplicate Clause on", async () => {
    const playerId = await signIn()
    const runId = await insertRun({ kind: "soul_link", rules: defaultRules() })

    await insertJourney(runId, playerId)

    await setRulesOf({ runId, rules: { "shared-duplicate-clause": true } })

    const rules = await rulesOf(runId)

    expect(rules["shared-duplicate-clause"]).toBe(true)
    expect(rules["duplicate-clause"]).toBe(true)
  })

  test("the Duplicate Clause going off turns the shared one off", async () => {
    const playerId = await signIn()
    const runId = await insertRun({
      kind: "soul_link",
      rules: {
        ...defaultRules(),
        "duplicate-clause": true,
        "shared-duplicate-clause": true,
      },
    })

    await insertJourney(runId, playerId)

    await setRulesOf({ runId, rules: { "duplicate-clause": false } })

    const rules = await rulesOf(runId)

    expect(rules["duplicate-clause"]).toBe(false)
    expect(rules["shared-duplicate-clause"]).toBe(false)
  })

  test.each(["waiting", "failed", "complete"] as const)(
    "a %s Run refuses it as run-not-active and keeps its Rules",
    async (state) => {
      const playerId = await signIn()
      const runId = await insertRun({
        ...stateColumns(state),
        rules: defaultRules(),
      })

      await insertJourney(runId, playerId)

      await expect(
        setRulesOf({ runId, rules: { whiteout: true } })
      ).resolves.toEqual(refused("run-not-active"))
      await expect(rulesOf(runId)).resolves.toEqual(defaultRules())
    }
  )

  test("a Player who is not in the Run is denied", async () => {
    await signIn()
    const runId = await makeRun()

    await signIn({ displayName: "Misty" })

    await expect(
      setRulesOf({ runId, rules: { whiteout: true } })
    ).resolves.toEqual(denied)
  })

  test("two toggles of different Rules at the same time both hold", async () => {
    await signIn()
    const runId = await makeRun()
    let sent: ReturnType<typeof setRulesOf>[] = []

    // Both toggles start while the test holds the Run lock, so each reads the
    // Rules only after the other's write.
    await db.transaction(async (tx) => {
      await lockRun(tx, runId)
      sent = [
        setRulesOf({ runId, rules: { whiteout: true } }),
        setRulesOf({ runId, rules: { "nickname-clause": false } }),
      ]
      await waitUntilBlocking(tx, 2)
    })

    await expect(Promise.all(sent)).resolves.toEqual([accepted, accepted])

    const [row] = await db
      .select({ rules: runs.rules })
      .from(runs)
      .where(eq(runs.id, runId))

    expect(row!.rules).toEqual({
      ...defaultRules(),
      whiteout: true,
      "nickname-clause": false,
    })
  })
})
