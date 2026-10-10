import { defineProtocol } from "headcanon"

import { recordEncounter } from "./mutations"
import type { RunState } from "./state"

/**
 * The protocol of every change to a Run (technical design, "The named changes
 * to a Run"). Its arguments only gain optional fields; a breaking change is a
 * new protocol id.
 */
export const runProtocol = defineProtocol<RunState>()({
  id: "run.v1",
  mutations: [recordEncounter],
})
