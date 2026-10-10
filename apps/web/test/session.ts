import { vi } from "vitest"

import { auth } from "@/lib/auth"

import { createPlayer } from "./players"

/**
 * Makes a Player and stubs the Auth.js session to them. The test file must
 * mock `@/lib/auth` with `auth: vi.fn()`, so the real gate decides who may
 * act.
 */
export async function signIn(
  options: Parameters<typeof createPlayer>[0] = { displayName: "Ash" }
): Promise<string> {
  const playerId = await createPlayer(options)

  vi.mocked(auth).mockResolvedValue(
    // The gate reads only the user id of the Auth.js session.
    { user: { id: playerId }, expires: "" } as never
  )

  return playerId
}

/** Stubs the Auth.js session to nobody. */
export function signOut(): void {
  vi.mocked(auth).mockResolvedValue(null as never)
}
