import { defineMutation } from "headcanon"
import { andThen, ok } from "serializable-result"

import * as correctEncounterChange from "./changes/correct-encounter"
import * as recordEncounterChange from "./changes/record-encounter"
import * as removeEncounterChange from "./changes/remove-encounter"
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

/**
 * Change 2, Correct an Encounter: the Species, Form, and origin met, and the
 * Pokémon's Species and Form when it follows. The server alone refuses
 * `unknown-entry`.
 */
export const correctEncounter = defineMutation({
  name: "run.correct-encounter.v1",
  args: correctEncounterChange.correctEncounterArgs,
  refusal: refusalSchema("run-not-active", "gone", "unknown-entry"),
  predict: (run: RunState, args) =>
    andThen(correctEncounterChange.check(run, args), (effect) =>
      ok(correctEncounterChange.apply(run, effect))
    ),
})

/** Change 3, Remove an Encounter: the Encounter and its Pokémon go. */
export const removeEncounter = defineMutation({
  name: "run.remove-encounter.v1",
  args: removeEncounterChange.removeEncounterArgs,
  refusal: refusalSchema("run-not-active", "gone"),
  predict: (run: RunState, args) =>
    andThen(removeEncounterChange.check(run, args), (effect) =>
      ok(removeEncounterChange.apply(run, effect))
    ),
})
