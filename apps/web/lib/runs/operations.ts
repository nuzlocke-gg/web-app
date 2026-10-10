import { defineOperation } from "headcanon"
import { z } from "zod"

import { runName } from "./run-name"

/**
 * Makes a solo Run on one Game of one Map, with the actor as its only Player.
 * Refused as `unknown-game` when the game data has no such Map or Game. The
 * server makes the Run id.
 */
export const createRun = defineOperation({
  name: "run.create.v1",
  args: z.object({ mapId: z.string(), gameId: z.string(), name: runName }),
  result: z.object({ runId: z.uuid() }),
  refusal: z.enum(["unknown-game"]),
})
