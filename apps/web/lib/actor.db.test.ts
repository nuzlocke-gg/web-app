import { beforeEach, describe, expect, test, vi } from "vitest"

import { auth } from "@/lib/auth"
import { createPlayer } from "@/test/players"
import { redirectOf } from "@/test/redirect"

import { readAccount, requireActor } from "./actor"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))

const mockSessionFor = (userId: string | null) =>
  vi.mocked(auth).mockResolvedValue(
    // The gate reads only the user id of the Auth.js session.
    (userId ? { user: { id: userId }, expires: "" } : null) as never
  )

describe("requireActor", () => {
  beforeEach(() => vi.mocked(auth).mockReset())

  test("returns the id of a signed-in Player with a Display Name", async () => {
    const playerId = await createPlayer({ displayName: "Ash" })
    mockSessionFor(playerId)

    await expect(requireActor()).resolves.toBe(playerId)
  })

  test("sends a visitor without a session to the sign-in page", async () => {
    mockSessionFor(null)

    await expect(redirectOf(requireActor())).resolves.toBe("/sign-in")
  })

  test("refuses a tombstoned actor", async () => {
    const playerId = await createPlayer({ tombstone: true })
    mockSessionFor(playerId)

    await expect(redirectOf(requireActor())).resolves.toBe("/sign-in")
    await expect(readAccount()).resolves.toBeNull()
  })

  test("sends a Player with no Display Name to the name step", async () => {
    const playerId = await createPlayer({ displayName: null })
    mockSessionFor(playerId)

    await expect(redirectOf(requireActor())).resolves.toBe("/welcome")
  })
})
