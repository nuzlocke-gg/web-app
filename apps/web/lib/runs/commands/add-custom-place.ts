import "server-only"

import { acceptMutation, refuseMutation } from "headcanon/server"

import { customPlaces } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { addCustomPlace } from "../mutations"
import { refusal } from "../refusals"
import { isCustomPlaceNameTaken } from "./custom-place-errors"
import { admitPlayer, screenPlayer } from "./player-access"

/** Adds a Custom Place to a Run, for any of its players. */
export const addCustomPlaceBinding = runsBinder.bind(addCustomPlace, {
  screen: screenPlayer,
  admit: admitPlayer,
  execute: async ({ tx, state: run, effect, stamp }) => {
    try {
      await tx
        .insert(customPlaces)
        .values({ runId: run.id, ...effect.customPlace })
    } catch (error) {
      // Run no query after this: the failed INSERT aborted the attempt,
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
