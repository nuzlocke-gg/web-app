import { defineMutation } from "headcanon"

import * as changeFormChange from "./changes/change-form"
import * as correctEncounterChange from "./changes/correct-encounter"
import * as editDeathChange from "./changes/edit-death"
import * as evolvePokemonChange from "./changes/evolve-pokemon"
import * as movePokemonChange from "./changes/move-pokemon"
import * as recordDeathChange from "./changes/record-death"
import * as recordEncounterChange from "./changes/record-encounter"
import * as removeEncounterChange from "./changes/remove-encounter"
import * as removePokemonChange from "./changes/remove-pokemon"
import * as renamePokemonChange from "./changes/rename-pokemon"
import * as undoDeathChange from "./changes/undo-death"
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
 * Change 6, Move a Pokémon: moves between the Party and the Box, committed
 * together, as a swap into a full Party.
 */
export const movePokemon = defineMutation({
  name: "run.move-pokemon.v1",
  args: movePokemonChange.movePokemonArgs,
  refusal: refusalSchema("run-not-active", "gone", "party-full"),
  check: movePokemonChange.check,
  apply: movePokemonChange.apply,
})

/**
 * Change 7, Record a death of a living Pokémon, with an optional level and
 * cause. The server alone refuses `level-out-of-range`.
 */
export const recordDeath = defineMutation({
  name: "run.record-death.v1",
  args: recordDeathChange.recordDeathArgs,
  refusal: refusalSchema("run-not-active", "gone", "level-out-of-range"),
  check: recordDeathChange.check,
  apply: recordDeathChange.apply,
})

/**
 * Change 8, Edit a death: the level and cause of a dead Pokémon. The server
 * alone refuses `level-out-of-range`.
 */
export const editDeath = defineMutation({
  name: "run.edit-death.v1",
  args: editDeathChange.editDeathArgs,
  refusal: refusalSchema("run-not-active", "gone", "level-out-of-range"),
  check: editDeathChange.check,
  apply: editDeathChange.apply,
})

/** Change 9, Undo a death: the Pokémon lives again where it died, or in the Box. */
export const undoDeath = defineMutation({
  name: "run.undo-death.v1",
  args: undoDeathChange.undoDeathArgs,
  refusal: refusalSchema("run-not-active", "gone"),
  check: undoDeathChange.check,
  apply: undoDeathChange.apply,
})

/**
 * Change 10, Remove a Pokémon traded away or released. Its Encounter and
 * history stay.
 */
export const removePokemon = defineMutation({
  name: "run.remove-pokemon.v1",
  args: removePokemonChange.removePokemonArgs,
  refusal: refusalSchema("run-not-active", "gone"),
  check: removePokemonChange.check,
  apply: removePokemonChange.apply,
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
