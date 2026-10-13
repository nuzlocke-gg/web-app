import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { customPlaces } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { renameCustomPlace } from "../mutations"
import { refusal } from "../refusals"
import { isCustomPlaceNameTaken } from "./custom-place-errors"
import { admitPlayer, screenPlayer } from "./player-access"

/**
 * Renames a Custom Place of a Run, for any of its players. A rename to the
 * name it has is accepted with no new revision.
 */
export const renameCustomPlaceBinding = runsBinder.bind(renameCustomPlace, {
  screen: screenPlayer,
  admit: admitPlayer,
  execute: async ({ tx, state: run, effect, stamp }) => {
    try {
      await tx
        .update(customPlaces)
        .set({ name: effect.name })
        .where(
          and(
            eq(customPlaces.runId, run.id),
            eq(customPlaces.id, effect.customPlaceId)
          )
        )
    } catch (error) {
      // Run no query after this: the failed UPDATE aborted the attempt,
      // and the refusal rolls its savepoint back.
      if (isCustomPlaceNameTaken(error)) {
        return refuseMutation(refusal("custom-place-name-taken"))
      }

      throw error
    }

    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})
