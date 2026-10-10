import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { encounters } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import * as removeEncounterChange from "../changes/remove-encounter"
import { bumpRevision } from "../lock"
import { removeEncounter } from "../mutations"
import { admitEncounterOwner, screenPlayer } from "./player-access"

/**
 * Removes an Encounter of the actor's Journey. The shared `check` decides it
 * over the locked Run; deleting the Encounter row cascades to its Pokémon.
 */
export const removeEncounterBinding = runsBinder.bind(removeEncounter, {
  screen: screenPlayer,
  admit: admitEncounterOwner,
  execute: async ({ tx, args, evidence, stamp }) => {
    const { run } = evidence
    const checked = removeEncounterChange.check(run, args)

    if (!checked.ok) return refuseMutation(checked.error)

    const effect = checked.value

    await tx
      .delete(encounters)
      .where(
        and(
          eq(encounters.id, effect.encounterId),
          eq(encounters.journeyId, effect.journeyId)
        )
      )
    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})
