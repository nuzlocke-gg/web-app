import "server-only"

import { eq } from "drizzle-orm"
import { acceptOperation } from "headcanon/server"

import { runs } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { setHouseRules } from "../operations"
import { admitPlayer, screenPlayer } from "./player-access"

/**
 * Sets the House rules of a Run for any of its players, in any state, under
 * the Run lock; the last write wins. The text it already has is accepted with
 * no new revision.
 */
export const setHouseRulesBinding = runsBinder.bindOperation(setHouseRules, {
  screen: screenPlayer,
  admit: admitPlayer,
  execute: async ({ tx, args, evidence: { state: run }, stamp }) => {
    if (run.houseRules === args.houseRules) {
      return acceptOperation(undefined, { unchanged: true })
    }

    await tx
      .update(runs)
      .set({ houseRules: args.houseRules })
      .where(eq(runs.id, run.id))
    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptOperation()
  },
})
