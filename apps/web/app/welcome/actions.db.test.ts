import { eq } from "drizzle-orm"
import { describe, expect, test, vi } from "vitest"

import { requireAccount } from "@/lib/actor"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { createPlayer } from "@/test/players"
import { redirectOf } from "@/test/redirect"

import { chooseDisplayName } from "./actions"

// The name step runs before the Player has an actor, so the stub is one
// level below requireActor.
vi.mock("@/lib/actor", () => ({ requireAccount: vi.fn() }))

async function signInNewPlayer(): Promise<string> {
  const id = await createPlayer({ displayName: null })

  vi.mocked(requireAccount).mockResolvedValue({
    id,
    email: null,
    givenName: "Ash",
    displayName: null,
  })

  return id
}

function choose(displayName: string) {
  const form = new FormData()
  form.set("displayName", displayName)

  return chooseDisplayName({ refusal: null }, form)
}

async function displayNameOf(playerId: string) {
  const [row] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, playerId))

  return row?.displayName
}

describe("chooseDisplayName", () => {
  test("trims the Display Name, saves it, and goes home", async () => {
    const playerId = await signInNewPlayer()

    await expect(redirectOf(choose("  Ash  "))).resolves.toBe("/")
    await expect(displayNameOf(playerId)).resolves.toBe("Ash")
  })

  test.each([
    ["", "empty"],
    ["    ", "empty"],
    ["a".repeat(31), "too-long"],
  ])("refuses %j and saves nothing", async (displayName, refusal) => {
    const playerId = await signInNewPlayer()

    await expect(choose(displayName)).resolves.toEqual({ refusal })
    await expect(displayNameOf(playerId)).resolves.toBeNull()
  })

  test("accepts 30 characters with an emoji", async () => {
    const playerId = await signInNewPlayer()
    const name = "🐉" + "a".repeat(29)

    await expect(redirectOf(choose(name))).resolves.toBe("/")
    await expect(displayNameOf(playerId)).resolves.toBe(name)
  })

  test("two Players can have the same Display Name", async () => {
    const first = await signInNewPlayer()
    await redirectOf(choose("Red"))
    const second = await signInNewPlayer()
    await redirectOf(choose("Red"))

    await expect(displayNameOf(first)).resolves.toBe("Red")
    await expect(displayNameOf(second)).resolves.toBe("Red")
  })
})
