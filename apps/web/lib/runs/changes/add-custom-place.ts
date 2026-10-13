import { produce } from "immer"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { customPlaceName, customPlaceNameTaken } from "../custom-place-name"
import { refusal, type RunRefusal } from "../refusals"
import { byId, type CustomPlaceState, type RunState } from "../state"

/**
 * The arguments of Add a Custom Place. The id is UUID v7, chosen once when
 * the player adds it; its time orders the Encounters list.
 */
export const addCustomPlaceArgs = z.object({
  runId: z.uuid(),
  customPlaceId: z.uuidv7(),
  name: customPlaceName,
})

/** The arguments of Add a Custom Place. */
export type AddCustomPlaceArgs = z.infer<typeof addCustomPlaceArgs>

/** The Refusals that {@link check} gives. */
export type AddCustomPlaceRefusal = RunRefusal<
  "run-not-active" | "custom-place-name-taken"
>

/** What Add a Custom Place adds. */
export type AddCustomPlaceEffect = { customPlace: CustomPlaceState }

/**
 * Decides Add a Custom Place: refused on a Run that is not Active and for a
 * name another Custom Place of the Run has, in any letter case.
 */
export function check(
  run: RunState,
  args: AddCustomPlaceArgs
): Result<AddCustomPlaceEffect, AddCustomPlaceRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  if (customPlaceNameTaken(run, args.name)) {
    return err(refusal("custom-place-name-taken"))
  }

  return ok({ customPlace: { id: args.customPlaceId, name: args.name } })
}

/** Adds the Custom Place in id order, as the canon loader reads them. */
export function apply(run: RunState, effect: AddCustomPlaceEffect): RunState {
  return produce(run, (draft) => {
    draft.customPlaces.push(effect.customPlace)
    draft.customPlaces.sort(byId)
  })
}
