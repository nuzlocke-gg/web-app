import { sql } from "drizzle-orm"
import { describe, expect, test } from "vitest"

import { db } from "@/lib/db"
import { postgresErrorCode } from "@/lib/db/errors"
import { insertRun } from "@/test/runs"

import { lockRun } from "./lock"

const LOCK_NOT_AVAILABLE = "55P03"

async function settingOf(name: string) {
  const result = await db.execute(sql.raw(`SHOW ${name}`))

  return result.rows[0]?.[name]
}

describe("the Run lock", () => {
  test("a second writer waits for the lock_timeout, then fails", async () => {
    const runId = await insertRun()
    let secondWriterError: unknown

    await db.transaction(async (first) => {
      await lockRun(first, runId)

      const startedAt = Date.now()
      secondWriterError = await db
        .transaction((second) => lockRun(second, runId))
        .then(
          () => undefined,
          (error: unknown) => error
        )

      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(1_900)
    })

    expect(postgresErrorCode(secondWriterError)).toBe(LOCK_NOT_AVAILABLE)
  })

  test("returns the locked Run, or nothing for an unknown id", async () => {
    const runId = await insertRun()

    await db.transaction(async (tx) => {
      await expect(lockRun(tx, runId)).resolves.toMatchObject({ id: runId })
      await expect(
        lockRun(tx, "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d")
      ).resolves.toBeUndefined()
    })
  })
})

describe("the database deadlines", () => {
  test.each([
    ["lock_timeout", "2s"],
    ["statement_timeout", "3s"],
    ["idle_in_transaction_session_timeout", "5s"],
  ])("a connection of the app has %s %s", async (name, value) => {
    await expect(settingOf(name)).resolves.toBe(value)
  })
})
