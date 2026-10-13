import "server-only"

import { and, eq } from "drizzle-orm"
import { matchesPostgresError } from "headcanon/drizzle"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { customPlaces } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { removeCustomPlace } from "../mutations"
import { refusal } from "../refusals"
import { admitPlayer, screenPlayer } from "./player-access"

/**
 * Whether a database error is the foreign key that keeps a Custom Place while
 * an Encounter names it.
 */
export function isCustomPlaceInUse(error: unknown): boolean {
  return matchesPostgresError(error, {
    code: "23503",
    constraint: "encounters_custom_place_fk",
  })
}

/**
 * Removes a Custom Place that no Journey has an Encounter at, for any player
 * of the Run.
 */
export const removeCustomPlaceBinding = runsBinder.bind(removeCustomPlace, {
  screen: screenPlayer,
  admit: admitPlayer,
  execute: async ({ tx, state: run, effect, stamp }) => {
    try {
      await tx
        .delete(customPlaces)
        .where(
          and(
            eq(customPlaces.runId, run.id),
            eq(customPlaces.id, effect.customPlaceId)
          )
        )
    } catch (error) {
      // Run no query after this: the failed DELETE aborted the attempt,
      // and the refusal rolls its savepoint back.
      if (isCustomPlaceInUse(error)) {
        return refuseMutation(refusal("custom-place-in-use"))
      }

      throw error
    }

    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})
