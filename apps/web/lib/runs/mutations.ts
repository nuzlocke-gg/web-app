import { defineMutation } from "headcanon"

import * as changeFormChange from "./changes/change-form"
import * as correctEncounterChange from "./changes/correct-encounter"
import * as evolvePokemonChange from "./changes/evolve-pokemon"
import * as recordEncounterChange from "./changes/record-encounter"
import * as removeEncounterChange from "./changes/remove-encounter"
import * as renamePokemonChange from "./changes/rename-pokemon"
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

/** Change 4, Rename a Pokémon, living or dead: its nickname, or none. */
export const renamePokemon = defineMutation({
  name: "run.rename-pokemon.v1",
  args: renamePokemonChange.renamePokemonArgs,
  refusal: refusalSchema("run-not-active", "gone"),
  check: renamePokemonChange.check,
  apply: renamePokemonChange.apply,
})

/**
 * Change 5, Evolve a Pokémon: "Next in its line" adds an evolution line;
 * "Other species" corrects a wrong Species. The server alone refuses
 * `unknown-entry`.
 */
export const evolvePokemon = defineMutation({
  name: "run.evolve-pokemon.v1",
  args: evolvePokemonChange.evolvePokemonArgs,
  refusal: refusalSchema("run-not-active", "gone", "unknown-entry"),
  check: evolvePokemonChange.check,
  apply: evolvePokemonChange.apply,
})

/**
 * Change 11, Change the Form of a Pokémon, living or dead. The server alone
 * refuses `unknown-entry`.
 */
export const changeForm = defineMutation({
  name: "run.change-form.v1",
  args: changeFormChange.changeFormArgs,
  refusal: refusalSchema("run-not-active", "gone", "unknown-entry"),
  check: changeFormChange.check,
  apply: changeFormChange.apply,
})
