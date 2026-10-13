import { defineProtocol } from "headcanon"

import {
  addCustomPlace,
  changeForm,
  correctEncounter,
  editDeath,
  evolvePokemon,
  movePokemon,
  recordDeath,
  recordEncounter,
  removeCustomPlace,
  removeEncounter,
  removePokemon,
  renameCustomPlace,
  renamePokemon,
  restorePokemon,
  setRules,
  undoDeath,
} from "./mutations"
import type { RunState } from "./state"

/**
 * The protocol of every change to a Run (technical design, "The named changes
 * to a Run"). Its arguments only gain optional fields; a breaking change is a
 * new protocol id.
 */
export const runProtocol = defineProtocol<RunState>()({
  id: "run.v1",
  mutations: [
    recordEncounter,
    correctEncounter,
    removeEncounter,
    renamePokemon,
    evolvePokemon,
    movePokemon,
    recordDeath,
    editDeath,
    undoDeath,
    removePokemon,
    changeForm,
    addCustomPlace,
    renameCustomPlace,
    removeCustomPlace,
    setRules,
    restorePokemon,
  ],
})
