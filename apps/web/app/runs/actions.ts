"use server"

import {
  createNextMutationAction,
  createNextOperationAction,
} from "headcanon/next/server"

import { runsBinder } from "@/lib/runs/binder"
import { changeFormBinding } from "@/lib/runs/commands/change-form"
import { correctEncounterBinding } from "@/lib/runs/commands/correct-encounter"
import { createRunBinding } from "@/lib/runs/commands/create-run"
import { evolvePokemonBinding } from "@/lib/runs/commands/evolve-pokemon"
import { recordEncounterBinding } from "@/lib/runs/commands/record-encounter"
import { removeEncounterBinding } from "@/lib/runs/commands/remove-encounter"
import { renamePokemonBinding } from "@/lib/runs/commands/rename-pokemon"
import { runProtocol } from "@/lib/runs/protocol"

/** The Server Action of `run.v1`: one command per change to a Run. */
export const runAction = createNextMutationAction({
  protocol: runProtocol,
  binder: runsBinder,
  commands: [
    recordEncounterBinding,
    correctEncounterBinding,
    removeEncounterBinding,
    renamePokemonBinding,
    evolvePokemonBinding,
    changeFormBinding,
  ],
})

/**
 * Makes a solo Run. A second delivery of one submission returns the first
 * Run's id. The New run form navigates to it from the hook's `onSettled`, not
 * with a server redirect: headcanon forwards a late redirect even for a
 * submission the player discarded.
 */
export const createRunAction = createNextOperationAction({
  binder: runsBinder,
  binding: createRunBinding,
})
