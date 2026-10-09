import "server-only"

import { asc, eq } from "drizzle-orm"
import { defineCanon, type Canon } from "headcanon"
import { cache } from "react"

import { readAccount } from "@/lib/actor"
import { db } from "@/lib/db"
import { journeys, runs } from "@/lib/db/schema"

import { isRunId, runAxis } from "./axis"
import type { RunState } from "./state"

/**
 * Reads one Run for the signed-in Player, uncached, with the revision of its
 * axis. Null when nobody is signed in, the id is not a UUID, the Run does not
 * exist, or the Player has no Journey in it, so the page never tells which.
 * Shared by the Run layout and its pages within one render.
 */
export const loadRunCanon = cache(
  async (runId: string): Promise<Canon<RunState> | null> => {
    const account = await readAccount()

    if (!account || !isRunId(runId)) return null

    return readRunCanon(runId, account.id)
  }
)

// Membership, the value, and the revision come from one snapshot, so a write
// that commits between two reads can never pair an old value with a new
// revision.
async function readRunCanon(
  runId: string,
  viewerId: string
): Promise<Canon<RunState> | null> {
  return db.transaction(
    async (tx) => {
      const [run] = await tx.select().from(runs).where(eq(runs.id, runId))

      if (!run) return null

      const runJourneys = await tx
        .select({
          id: journeys.id,
          playerId: journeys.playerId,
          gameId: journeys.gameId,
        })
        .from(journeys)
        .where(eq(journeys.runId, runId))
        .orderBy(asc(journeys.joinedAt), asc(journeys.id))

      if (!runJourneys.some((journey) => journey.playerId === viewerId)) {
        return null
      }

      return defineCanon<RunState>({
        value: {
          id: run.id,
          viewerId,
          name: run.name,
          mapId: run.mapId,
          kind: run.kind,
          state: run.state,
          visibility: run.visibility,
          attemptNumber: run.attemptNumber,
          rules: run.rules,
          journeys: runJourneys,
        },
        revisions: { [runAxis.of(run.id)]: run.revision },
      })
    },
    { isolationLevel: "repeatable read", accessMode: "read only" }
  )
}
