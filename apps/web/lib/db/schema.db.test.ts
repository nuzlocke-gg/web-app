import { randomUUID } from "node:crypto"
import { describe, expect, test } from "vitest"

import { db } from "@/lib/db"
import { postgresErrorCode } from "@/lib/db/errors"
import { users } from "@/lib/db/schema"

const CHECK_VIOLATION = "23514"

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
