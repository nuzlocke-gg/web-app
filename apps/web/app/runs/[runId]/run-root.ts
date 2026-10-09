"use client"

import {
  createNoRealtimeInvalidationAdapter,
  withVisibilityRefresh,
} from "headcanon"
import { createNextPredictedRoot } from "headcanon/next/client"
import {
  createPredictedRootContext,
  sessionStoragePersistence,
} from "headcanon/react"

import { runProtocol } from "@/lib/runs/protocol"

import { runAction } from "../actions"

const useRunRoot = createNextPredictedRoot({
  protocol: runProtocol,
  action: runAction,
  // A solo Run has no realtime transport. It refreshes when the page becomes
  // visible again (held while the browser is offline), never on a timer: a
  // query more often than every 5 minutes keeps Neon awake.
  invalidations: withVisibilityRefresh(createNoRealtimeInvalidationAdapter()),
  // One stored queue per Player and Run, so a Player who signs in to the same
  // tab never restores another Player's changes.
  persistence: (canon) =>
    sessionStoragePersistence(
      `run-queue:${canon.value.viewerId}:${canon.value.id}`
    ),
})

const runRoot = createPredictedRootContext(useRunRoot, { name: "RunRoot" })

/**
 * Mounts the Run's one predicted root. Key it by the viewer and the Run, so a
 * change of either mounts a new root with its own queue.
 */
export const RunRootProvider = runRoot.Provider

/** The Run as its screens show it: canon plus pending predictions. */
export const useRun = runRoot.useRoot
