import { produce } from "immer"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import { findViewerEncounter, type RunState } from "../state"
import { journeyOf } from "./drafts"

/** The arguments of Remove an Encounter: the actor's Encounter to delete. */
export const removeEncounterArgs = z.object({
  runId: z.uuid(),
  encounterId: z.uuid(),
})

/** The arguments of Remove an Encounter. */
export type RemoveEncounterArgs = z.infer<typeof removeEncounterArgs>

/** The Refusals that {@link check} gives. */
export type RemoveEncounterRefusal = RunRefusal<"run-not-active" | "gone">

/** The Encounter that Remove an Encounter deletes, with its Pokémon. */
export type RemoveEncounterEffect = {
  journeyId: string
  encounterId: string
}

/**
 * Decides Remove an Encounter for the viewer's Journey: refused on a Run that
 * is not Active and on an Encounter the Journey no longer has.
 */
export function check(
  run: RunState,
  args: RemoveEncounterArgs
): Result<RemoveEncounterEffect, RemoveEncounterRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerEncounter(run, args.encounterId)

  if (!found) return err(refusal("gone"))

  return ok({ journeyId: found.journey.id, encounterId: found.encounter.id })
}

/** Deletes the Encounter and its Pokémon, so its Slot is empty again. */
export function apply(run: RunState, effect: RemoveEncounterEffect): RunState {
  return produce(run, (draft) => {
    const journey = journeyOf(draft, effect.journeyId)

    journey.encounters = journey.encounters.filter(
      (encounter) => encounter.id !== effect.encounterId
    )
    journey.pokemon = journey.pokemon.filter(
      (pokemon) => pokemon.encounterId !== effect.encounterId
    )
  })
}
