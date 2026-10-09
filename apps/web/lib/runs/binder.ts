import "server-only"

import { createDrizzleMutationAuthority } from "headcanon/drizzle"
import { createMutationBinder } from "headcanon/server"

import { requireActor } from "@/lib/actor"
import { db } from "@/lib/db"

/**
 * The receipt authority for every write to a Run: one transaction per
 * attempt, receipts scoped to the Player, and two attempts at most.
 */
export const runAuthority = createDrizzleMutationAuthority({
  db,
  scope: (playerId: string) => playerId,
  maxAttempts: 2,
})

/**
 * Binds the commands of `run.v1` and the Run operations. Its actor is the
 * signed-in Player's id; `requireActor` redirects a tombstone to sign-in and
 * a Player with no Display Name to the name step before any command runs.
 * Command modules import this one, never the reverse.
 */
export const runsBinder = createMutationBinder({
  actor: requireActor,
  authority: runAuthority,
})

/** The transaction a Run command receives. */
export type RunTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
