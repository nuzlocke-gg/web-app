import { eq, sql } from "drizzle-orm"

import { runs } from "../lib/db/schema.ts"
import { testDb } from "./database.ts"

/**
 * Renames a Run behind the app's back, as another device would: a new name
 * and the next revision. The open tab sees it only after a refresh.
 */
export async function renameRunElsewhere(
  runId: string,
  name: string
): Promise<void> {
  await testDb
    .update(runs)
    .set({
      name,
      revision: sql`${runs.revision} + 1`,
      lastChangedAt: sql`now()`,
    })
    .where(eq(runs.id, runId))
}
