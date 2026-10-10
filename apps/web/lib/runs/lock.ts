import "server-only"

import { eq, sql } from "drizzle-orm"

import { runs } from "@/lib/db/schema"

import type { RunTransaction } from "./binder"

/**
 * Takes the Run lock (ADR 0002): `SELECT … FOR UPDATE` on the Run row. Every
 * writer to an existing Run calls it first in its transaction, before it
 * reads or writes anything else of the Run, then bumps `revision` with
 * `last_changed_at`. Waits at most the database's `lock_timeout` (2 s), then
 * fails with SQLSTATE `55P03`.
 * @returns The locked row, or undefined when the Run does not exist.
 */
export async function lockRun(tx: RunTransaction, runId: string) {
  const [run] = await tx
    .select()
    .from(runs)
    .where(eq(runs.id, runId))
    .for("update")

  return run
}

/**
 * Bumps the Run's revision with its `last_changed_at`, as every writer does
 * once under the Run lock after its writes.
 * @returns The new revision, for `stamp.record(runAxis.of(runId), revision)`.
 */
export async function bumpRevision(
  tx: RunTransaction,
  runId: string
): Promise<number> {
  const [run] = await tx
    .update(runs)
    .set({ revision: sql`${runs.revision} + 1`, lastChangedAt: sql`now()` })
    .where(eq(runs.id, runId))
    .returning({ revision: runs.revision })

  if (!run) throw new Error(`Run ${runId} is gone under its lock`)

  return run.revision
}
