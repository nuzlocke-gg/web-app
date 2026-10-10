import { defineMutation } from "headcanon"
import { andThen, ok } from "serializable-result"

import * as recordEncounterChange from "./changes/record-encounter"
import { refusalSchema } from "./refusals"
import type { RunState } from "./state"

/**
 * Change 1, Record an Encounter: one Encounter in a Slot at a Place of the
 * Map, and its Pokémon when Caught. The server alone refuses `unknown-entry`.
 */
export const recordEncounter = defineMutation({
  name: "run.record-encounter.v1",
  args: recordEncounterChange.recordEncounterArgs,
  refusal: refusalSchema("run-not-active", "slot-taken", "unknown-entry"),
  predict: (run: RunState, args) =>
    andThen(recordEncounterChange.check(run, args), (effect) =>
      ok(recordEncounterChange.apply(run, effect))
    ),
})
