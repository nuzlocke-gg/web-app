import { produce } from "immer"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { samePlace } from "../place"
import { refusal, type RunRefusal } from "../refusals"
import type { RunState } from "../state"

/** The arguments of Remove a Custom Place. */
export const removeCustomPlaceArgs = z.object({
  runId: z.uuid(),
  customPlaceId: z.uuid(),
})

/** The arguments of Remove a Custom Place. */
export type RemoveCustomPlaceArgs = z.infer<typeof removeCustomPlaceArgs>

/** The Refusals that {@link check} gives. */
export type RemoveCustomPlaceRefusal = RunRefusal<
  "run-not-active" | "gone" | "custom-place-in-use"
>

/** What Remove a Custom Place removes. */
export type RemoveCustomPlaceEffect = { customPlaceId: string }

/**
 * Decides Remove a Custom Place: refused on a Run that is not Active, on a
 * Custom Place that is gone, and while any Journey of the Run has an
 * Encounter there.
 */
export function check(
  run: RunState,
  args: RemoveCustomPlaceArgs
): Result<RemoveCustomPlaceEffect, RemoveCustomPlaceRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const exists = run.customPlaces.some(
    (custom) => custom.id === args.customPlaceId
  )

  if (!exists) return err(refusal("gone"))

  const place = { kind: "custom", id: args.customPlaceId } as const
  const inUse = run.journeys.some((journey) =>
    journey.encounters.some((encounter) => samePlace(encounter.place, place))
  )

  if (inUse) return err(refusal("custom-place-in-use"))

  return ok({ customPlaceId: args.customPlaceId })
}

/** Removes the Custom Place from the Run. */
export function apply(
  run: RunState,
  effect: RemoveCustomPlaceEffect
): RunState {
  return produce(run, (draft) => {
    draft.customPlaces = draft.customPlaces.filter(
      (custom) => custom.id !== effect.customPlaceId
    )
  })
}
