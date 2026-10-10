import { defineMutation } from "headcanon"

import * as correctEncounterChange from "./changes/correct-encounter"
import * as recordEncounterChange from "./changes/record-encounter"
import * as removeEncounterChange from "./changes/remove-encounter"
import { refusalSchema } from "./refusals"

/**
 * Change 1, Record an Encounter: one Encounter in a Slot at a Place of the
 * Map, and its Pokémon when Caught. The server alone refuses `unknown-entry`.
 */
export const recordEncounter = defineMutation({
  name: "run.record-encounter.v1",
  args: recordEncounterChange.recordEncounterArgs,
  refusal: refusalSchema("run-not-active", "slot-taken", "unknown-entry"),
  check: recordEncounterChange.check,
  apply: recordEncounterChange.apply,
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
  check: correctEncounterChange.check,
  apply: correctEncounterChange.apply,
})

/** Change 3, Remove an Encounter: the Encounter and its Pokémon go. */
export const removeEncounter = defineMutation({
  name: "run.remove-encounter.v1",
  args: removeEncounterChange.removeEncounterArgs,
  refusal: refusalSchema("run-not-active", "gone"),
  check: removeEncounterChange.check,
  apply: removeEncounterChange.apply,
})
