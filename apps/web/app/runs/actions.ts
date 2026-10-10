"use server"

import {
  createNextMutationAction,
  createNextOperationAction,
} from "headcanon/next/server"

import { runsBinder } from "@/lib/runs/binder"
import { createRunBinding } from "@/lib/runs/commands/create-run"
import { runProtocol } from "@/lib/runs/protocol"

/** The Server Action of `run.v1`. It has no commands until NUZ-51. */
export const runAction = createNextMutationAction({
  protocol: runProtocol,
  binder: runsBinder,
  commands: [],
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
