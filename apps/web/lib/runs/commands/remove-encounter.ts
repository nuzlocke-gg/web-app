import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation } from "headcanon/server"

import { encounters } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { removeEncounter } from "../mutations"
import { admitEncounterOwner, screenPlayer } from "./player-access"

/** Removes an Encounter of the actor's Journey, with its Pokémon. */
export const removeEncounterBinding = runsBinder.bind(removeEncounter, {
  screen: screenPlayer,
  admit: admitEncounterOwner,
  execute: async ({ tx, state: run, effect, stamp }) => {
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
