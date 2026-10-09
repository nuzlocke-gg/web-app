import { randomUUID } from "node:crypto"
import { describe, expect, test } from "vitest"

import { db } from "@/lib/db"
import { postgresErrorCode } from "@/lib/db/errors"
import { journeys, runs, users } from "@/lib/db/schema"
import { createPlayer } from "@/test/players"
import { insertRun, soloRunValues } from "@/test/runs"

const CHECK_VIOLATION = "23514"
const UNIQUE_VIOLATION = "23505"

async function insertError(values: typeof users.$inferInsert) {
  try {
    await db.insert(users).values(values)
  } catch (error) {
    return postgresErrorCode(error)
  }

  return "inserted"
}

describe("users", () => {
  test("the tombstone CHECK refuses deleted_at with an email still present", async () => {
    await expect(
      insertError({
        deletedAt: new Date(),
        email: `${randomUUID()}@example.test`,
      })
    ).resolves.toBe(CHECK_VIOLATION)
  })

  test("the tombstone CHECK refuses deleted_at with a Display Name still present", async () => {
    await expect(
      insertError({ deletedAt: new Date(), displayName: "Ash" })
    ).resolves.toBe(CHECK_VIOLATION)
  })

  test("the Display Name CHECK refuses 31 characters and an empty name", async () => {
    await expect(insertError({ displayName: "a".repeat(31) })).resolves.toBe(
      CHECK_VIOLATION
    )
    await expect(insertError({ displayName: "" })).resolves.toBe(
      CHECK_VIOLATION
    )
  })

  test("the Display Name CHECK counts code points, as the screen does", async () => {
    await expect(insertError({ displayName: "🐉".repeat(30) })).resolves.toBe(
      "inserted"
    )
  })

  test("a non-null email is unique; null emails are not", async () => {
    const email = `${randomUUID()}@example.test`

    await expect(insertError({ email })).resolves.toBe("inserted")
    await expect(insertError({ email })).resolves.toBe("23505")
    await expect(insertError({ deletedAt: new Date() })).resolves.toBe(
      "inserted"
    )
    await expect(insertError({ deletedAt: new Date() })).resolves.toBe(
      "inserted"
    )
  })
})

async function runInsertError(values: typeof runs.$inferInsert) {
  try {
    await db.insert(runs).values(values)
  } catch (error) {
    return postgresErrorCode(error)
  }

  return "inserted"
}

describe("runs", () => {
  test("a valid solo Run is inserted", async () => {
    await expect(runInsertError(soloRunValues())).resolves.toBe("inserted")
  })

  test.each<[string, Partial<typeof runs.$inferInsert>]>([
    ["an empty name", { name: "" }],
    ["a 61-character name", { name: "a".repeat(61) }],
    ["House rules over 2000 characters", { houseRules: "a".repeat(2001) }],
    ["a waiting solo Run", { state: "waiting" }],
    ["a fail cause on an active Run", { failCause: "Wiped to Norman" }],
    ["a finish date on an active Run", { finishedAt: new Date() }],
    ["a failed Run with no finish date", { state: "failed" }],
    ["an invite on an active Run", { inviteToken: randomUUID() }],
    ["a second Attempt with no previous Run", { attemptNumber: 2 }],
  ])("the CHECKs refuse %s", async (_, overrides) => {
    await expect(runInsertError(soloRunValues(overrides))).resolves.toBe(
      CHECK_VIOLATION
    )
  })

  test("a first Attempt with a previous Run is refused", async () => {
    const previousRunId = await insertRun()

    await expect(
      runInsertError(soloRunValues({ previousRunId }))
    ).resolves.toBe(CHECK_VIOLATION)
  })

  test("a Failed Run has at most one next Run", async () => {
    const chainId = await insertRun({
      state: "failed",
      finishedAt: new Date(),
    })
    const next = { previousRunId: chainId, chainId, attemptNumber: 2 }

    await expect(runInsertError(soloRunValues(next))).resolves.toBe("inserted")
    await expect(
      runInsertError(soloRunValues({ ...next, attemptNumber: 3 }))
    ).resolves.toBe(UNIQUE_VIOLATION)
  })
})

describe("journeys", () => {
  test("a Player has at most one Journey in a Run", async () => {
    const runId = await insertRun()
    const playerId = await createPlayer({ displayName: "Ash" })
    const journey = () => ({
      id: randomUUID(),
      runId,
      playerId,
      gameId: "emerald",
    })

    await db.insert(journeys).values(journey())

    await expect(
      db
        .insert(journeys)
        .values(journey())
        .then(
          () => "inserted",
          (error: unknown) => postgresErrorCode(error)
        )
    ).resolves.toBe(UNIQUE_VIOLATION)
  })
})
