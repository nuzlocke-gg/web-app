import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { journeys, runs } from "@/lib/db/schema"

/** One row of the Run list. */
export type RunListRow = {
  id: string
  name: string
  mapId: string
  /** The Game of the Player's own Journey. */
  gameId: string
}

/** The Player's Runs that are not archived, newest first. */
export async function listRunsOf(playerId: string): Promise<RunListRow[]> {
  return db
    .select({
      id: runs.id,
      name: runs.name,
      mapId: runs.mapId,
      gameId: journeys.gameId,
    })
    .from(journeys)
    .innerJoin(runs, eq(runs.id, journeys.runId))
    .where(and(eq(journeys.playerId, playerId), eq(runs.archived, false)))
    .orderBy(desc(runs.createdAt), desc(runs.id))
}
