import { randomUUID } from "node:crypto"

import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

/**
 * Inserts a Player for a test. Each call makes a fresh account, so tests never
 * share rows. A tombstone gets no email, name, or Display Name.
 */
export async function createPlayer(
  options: { displayName?: string | null; tombstone?: boolean } = {}
): Promise<string> {
  const values = options.tombstone
    ? { deletedAt: new Date() }
    : {
        email: `${randomUUID()}@example.test`,
        name: "Ash",
        displayName: options.displayName ?? null,
      }

  const [row] = await db
    .insert(users)
    .values(values)
    .returning({ id: users.id })

  return row!.id
}
