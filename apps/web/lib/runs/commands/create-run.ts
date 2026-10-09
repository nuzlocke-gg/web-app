import "server-only"

import { listMaps } from "@workspace/game-data"
import { sql } from "drizzle-orm"
import {
  acceptOperation,
  allowAdmission,
  allowScreening,
  refuseMutation,
} from "headcanon/server"
import { randomUUID } from "node:crypto"

import { journeys, runs } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { createRun } from "../operations"
import { defaultRules } from "../rules"

const FIRST_REVISION = 1

function isGameOfMap(mapId: string, gameId: string): boolean {
  const map = listMaps().find((candidate) => candidate.id === mapId)

  return map?.games.some((game) => game.id === gameId) ?? false
}

/**
 * Makes a solo Run: Active from the start, private, Attempt 1 at the root of
 * its own Chain, with every Rule at its default and one Journey for the
 * actor. A new Run has no row to lock yet; nobody can see it before the
 * transaction commits.
 */
export const createRunBinding = runsBinder.bindOperation(createRun, {
  screen: () => allowScreening(),
  admit: () => allowAdmission(),
  execute: async ({ tx, actor, args, stamp }) => {
    if (!isGameOfMap(args.mapId, args.gameId)) {
      return refuseMutation("unknown-game" as const)
    }

    const runId = randomUUID()

    await tx.insert(runs).values({
      id: runId,
      kind: "solo",
      state: "active",
      name: args.name,
      mapId: args.mapId,
      visibility: "private",
      rules: defaultRules(),
      startedAt: sql`now()`,
      lastChangedAt: sql`now()`,
      revision: FIRST_REVISION,
      chainId: runId,
      attemptNumber: 1,
    })

    await tx.insert(journeys).values({
      id: randomUUID(),
      runId,
      playerId: actor,
      gameId: args.gameId,
    })

    stamp.record(runAxis.of(runId), FIRST_REVISION)

    return acceptOperation({ runId })
  },
})
