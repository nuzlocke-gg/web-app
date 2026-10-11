import { defineOperation } from "headcanon"
import { z } from "zod"

import { houseRules } from "./house-rules"
import { rulePatch } from "./rules"
import { runName } from "./run-name"

/**
 * Makes a solo Run on one Game of one Map, with the actor as its only Player.
 * `rules` sets Rules away from their defaults, normalized as Set the Rules
 * does. Refused as `unknown-game` when the game data has no such Map or Game.
 * The server makes the Run id.
 */
export const createRun = defineOperation({
  name: "run.create.v1",
  args: z.object({
    mapId: z.string(),
    gameId: z.string(),
    name: runName,
    rules: rulePatch.optional(),
  }),
  result: z.object({ runId: z.uuid() }),
  refusal: z.enum(["unknown-game"]),
})

/**
 * Sets a Run's House rules, or clears them with null. Any player of the Run,
 * in any state; the last write wins.
 */
export const setHouseRules = defineOperation({
  name: "run.set-house-rules.v1",
  args: z.object({ runId: z.uuid(), houseRules }),
  // Spelled out because headcanon does not export the default no-result and
  // no-refusal schema types, which an exported operation's declaration names
  // (NUZ-72).
  result: z.undefined(),
  refusal: z.never(),
})
