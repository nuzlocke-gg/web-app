import { vi } from "vitest"

import { auth } from "@/lib/auth"

import { createPlayer } from "./players"

let signedInPlayerId: string | null = null

/**
 * Makes a Player and stubs the Auth.js session to them. The test file must
 * mock `@/lib/auth` with `auth: vi.fn()`, so the real gate decides who may
 * act.
 */
export async function signIn(
  options: Parameters<typeof createPlayer>[0] = { displayName: "Ash" }
): Promise<string> {
  const playerId = await createPlayer(options)

  signedInPlayerId = playerId
  vi.mocked(auth).mockResolvedValue(
    // The gate reads only the user id of the Auth.js session.
    { user: { id: playerId }, expires: "" } as never
  )

  return playerId
}

/** Stubs the Auth.js session to nobody. */
export function signOut(): void {
  signedInPlayerId = null
  vi.mocked(auth).mockResolvedValue(null as never)
}

/**
 * The receipt scope of the signed-in Player, as a Run root stamps it on an
 * envelope. Empty when nobody is signed in.
 */
export function signedInScope(): string {
  return signedInPlayerId ?? ""
}
