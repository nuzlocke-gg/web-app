import { unchanged, type Unchanged } from "headcanon"
import { produce } from "immer"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { customPlaceName, customPlaceNameTaken } from "../custom-place-name"
import { refusal, type RunRefusal } from "../refusals"
import type { RunState } from "../state"
import { customPlaceOf } from "./drafts"

/** The arguments of Rename a Custom Place. */
export const renameCustomPlaceArgs = z.object({
  runId: z.uuid(),
  customPlaceId: z.uuid(),
  name: customPlaceName,
})

/** The arguments of Rename a Custom Place. */
export type RenameCustomPlaceArgs = z.infer<typeof renameCustomPlaceArgs>

/** The Refusals that {@link check} gives. */
export type RenameCustomPlaceRefusal = RunRefusal<
  "run-not-active" | "gone" | "custom-place-name-taken"
>

/** What Rename a Custom Place changes. */
export type RenameCustomPlaceEffect = { customPlaceId: string; name: string }

/**
 * Decides Rename a Custom Place, also while it has Encounters: refused on a
 * Run that is not Active, on a Custom Place that is gone, and for a name
 * another Custom Place of the Run has, in any letter case. A new letter case
 * of its own name is accepted.
 * @returns {@link unchanged} when the Custom Place already has this name.
 */
export function check(
  run: RunState,
  args: RenameCustomPlaceArgs
): Result<RenameCustomPlaceEffect | Unchanged, RenameCustomPlaceRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const customPlace = run.customPlaces.find(
    (custom) => custom.id === args.customPlaceId
  )

  if (!customPlace) return err(refusal("gone"))

  if (customPlace.name === args.name) return ok(unchanged())

  if (customPlaceNameTaken(run, args.name, customPlace.id)) {
    return err(refusal("custom-place-name-taken"))
  }

  return ok({ customPlaceId: customPlace.id, name: args.name })
}

/** Sets the Custom Place's name. */
export function apply(
  run: RunState,
  effect: RenameCustomPlaceEffect
): RunState {
  return produce(run, (draft) => {
    customPlaceOf(draft, effect.customPlaceId).name = effect.name
  })
}
