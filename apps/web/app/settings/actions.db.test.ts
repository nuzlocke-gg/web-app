import { eq } from "drizzle-orm"
import { describe, expect, test, vi } from "vitest"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { createPlayer } from "@/test/players"
import { redirectOf } from "@/test/redirect"

import { changeDisplayName } from "./actions"

// Only the session is stubbed, so the real gate decides who may act.
vi.mock("@/lib/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }))
// refresh() works only inside a request.
vi.mock("next/cache", () => ({ refresh: vi.fn() }))

async function signIn(options: Parameters<typeof createPlayer>[0]) {
  const playerId = await createPlayer(options)

  vi.mocked(auth).mockResolvedValue(
    // The gate reads only the user id of the Auth.js session.
    { user: { id: playerId }, expires: "" } as never
  )

  return playerId
}

function change(displayName: string) {
  const form = new FormData()
  form.set("displayName", displayName)

  return changeDisplayName({ refusal: null, savedName: null }, form)
}

async function displayNameOf(playerId: string) {
  const [row] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, playerId))

  return row?.displayName
}

describe("changeDisplayName", () => {
  test("saves the trimmed name, which reads back", async () => {
    const playerId = await signIn({ displayName: "Ash" })

    await expect(change("  Misty 🌊  ")).resolves.toEqual({
      refusal: null,
      savedName: "Misty 🌊",
    })
    await expect(displayNameOf(playerId)).resolves.toBe("Misty 🌊")
  })

  test.each([
    ["", "empty"],
    ["    ", "empty"],
    ["a".repeat(31), "too-long"],
  ])("refuses %j and keeps the old name", async (displayName, refusal) => {
    const playerId = await signIn({ displayName: "Ash" })

    await expect(change(displayName)).resolves.toEqual({
      refusal,
      savedName: null,
    })
    await expect(displayNameOf(playerId)).resolves.toBe("Ash")
  })

  test("a tombstoned actor cannot change a name", async () => {
    const playerId = await signIn({ tombstone: true })

    await expect(redirectOf(change("Ash"))).resolves.toBe("/sign-in")
    await expect(displayNameOf(playerId)).resolves.toBeNull()
  })

  test("a Player with no Display Name goes to the name step first", async () => {
    const playerId = await signIn({ displayName: null })

    await expect(redirectOf(change("Ash"))).resolves.toBe("/welcome")
    await expect(displayNameOf(playerId)).resolves.toBeNull()
  })
})
