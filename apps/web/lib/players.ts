import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

/**
 * Sets the Display Name of a live Player. `name` must come from
 * `parseDisplayName`. A tombstoned Player is left as it is.
 */
export async function setDisplayName(
  playerId: string,
  name: string
): Promise<void> {
  await db
    .update(users)
    .set({ displayName: name })
    .where(and(eq(users.id, playerId), isNull(users.deletedAt)))
}
