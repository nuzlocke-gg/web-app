import { randomUUID } from "node:crypto"

import { db } from "@/lib/db"
import { runs } from "@/lib/db/schema"

/** The columns of a valid solo Run, for tests that write rows directly. */
export function soloRunValues(
  overrides: Partial<typeof runs.$inferInsert> = {}
): typeof runs.$inferInsert {
  const id = overrides.id ?? randomUUID()

  return {
    id,
    kind: "solo",
    state: "active",
    name: "Emerald Hardcore",
    mapId: "emerald",
    rules: {},
    startedAt: new Date(),
    lastChangedAt: new Date(),
    revision: 1,
    chainId: id,
    attemptNumber: 1,
    ...overrides,
  }
}

/** Inserts a valid solo Run with no Journey and returns its id. */
export async function insertRun(
  overrides: Partial<typeof runs.$inferInsert> = {}
): Promise<string> {
  const values = soloRunValues(overrides)

  await db.insert(runs).values(values)

  return values.id
}
