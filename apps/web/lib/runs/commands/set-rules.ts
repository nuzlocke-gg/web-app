import "server-only"

import { eq, sql } from "drizzle-orm"
import { acceptMutation } from "headcanon/server"

import { runs } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { setRules } from "../mutations"
import { admitPlayer, screenPlayer } from "./player-access"

/**
 * Sets the Rules of a Run for any of its players. Merges only the changed
 * Rules into the stored map, so two players' toggles of different Rules both
 * hold, and a Rule this build does not know keeps its value (ADR 0007). A
 * change that sets every Rule to the value it has is accepted with no new
 * revision.
 */
export const setRulesBinding = runsBinder.bind(setRules, {
  screen: screenPlayer,
  admit: admitPlayer,
  execute: async ({ tx, state: run, effect, stamp }) => {
    await tx
      .update(runs)
      .set({
        rules: sql`${runs.rules} || ${JSON.stringify(effect.rules)}::jsonb`,
      })
      .where(eq(runs.id, run.id))
    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})
