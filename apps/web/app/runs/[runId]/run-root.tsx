"use client"

import { toast } from "@workspace/ui/components/toast"
import {
  createNoRealtimeInvalidationAdapter,
  withVisibilityRefresh,
  type Canon,
  type ProtocolInvocation,
} from "headcanon"
import { createNextPredictedRoot } from "headcanon/next/client"
import {
  createPredictedRootContext,
  sessionStoragePersistence,
} from "headcanon/react"
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { useLeavePrompt } from "@/components/use-leave-prompt"
import { runProtocol } from "@/lib/runs/protocol"
import type { RunState } from "@/lib/runs/state"

import { runAction } from "../actions"
import { changeNotice, type RunChangeFailure } from "./change-notice"

/** One change to a Run, as a mutation of `run.v1` builds it. */
export type RunInvocation = ProtocolInvocation<typeof runProtocol>

const useRunRoot = createNextPredictedRoot({
  protocol: runProtocol,
  action: runAction,
  // The server denies a change delivered by another Player, such as one held
  // offline across a sign-out.
  scope: (canon) => canon.value.viewerId,
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
  // Neither needs the player: a refused replay keeps waiting for the server's
  // outcome, and a stall with the router refresh means a loader bug.
  recoveryListeners: {
    onConflict: (conflict) =>
      console.warn("A Run change was refused on replay", conflict),
    onFreshnessStalled: ({ reason, missingAxes }) =>
      console.error("The Run's canon stopped refreshing", reason, missingAxes),
  },
})

const runRoot = createPredictedRootContext(useRunRoot, { name: "RunRoot" })

/** The Run as its screens show it: canon plus pending predictions. */
export const useRun = runRoot.useRoot

type ReportFailure = (failure: RunChangeFailure, label: string | null) => void

const ReportFailureContext = createContext<ReportFailure | null>(null)

type RunRootProps = {
  canon: Canon<RunState>
  children: ReactNode
}

/**
 * Mounts the Run's one predicted root with its recovery: a toast for each
 * change that does not save, a persistent "Not saved yet" or out-of-date
 * toast, and the leave prompt while a change is unsent. Key it by the viewer and the Run, so
 * a change of either mounts a new root with its own queue.
 */
export function RunRoot({ canon, children }: RunRootProps) {
  const [outOfDate, setOutOfDate] = useState(false)

  const reportFailure = useCallback<ReportFailure>((failure, label) => {
    const notice = changeNotice(failure, label)

    if (!notice) return

    toast.add({
      type: "error",
      title: notice.title,
      description: notice.description,
    })

    if (notice.outOfDate) setOutOfDate(true)
  }, [])

  return (
    <runRoot.Provider
      canon={canon}
      // Hears every change that no `mutate` call names: one restored after a
      // reload or a return to the Run.
      mutationListeners={{
        onAcceptance: (accepted, mutation) => {
          if (!accepted.ok) {
            reportFailure(accepted.error, mutation.restored ? null : "Change")
          }
        },
      }}
    >
      <ReportFailureContext value={reportFailure}>
        {children}
        <RecoveryToast outOfDate={outOfDate} />
      </ReportFailureContext>
    </runRoot.Provider>
  )
}

/**
 * Returns the function that sends one change to the Run. A change that does
 * not save gives a toast named by `label`, and the Run refreshes to its true
 * state.
 * @example
 * const change = useRunChange()
 * change(recordEncounter({ ... }), "Encounter")
 */
export function useRunChange(): (
  invocation: RunInvocation,
  label: string
) => void {
  const { mutate } = useRun()
  const reportFailure = use(ReportFailureContext)

  if (!reportFailure) throw new Error("useRunChange must be used in a RunRoot")

  return useCallback(
    (invocation, label) => {
      const predicted = mutate(invocation, {
        onAcceptance: (accepted) => {
          if (!accepted.ok) reportFailure(accepted.error, label)
        },
      })

      if (!predicted.ok) {
        reportFailure({ kind: "domain", error: predicted.error }, label)
      }
    },
    [mutate, reportFailure]
  )
}

// The toast's small button gets a 44 px tap target, as its close button has.
const tapTarget = "relative after:absolute after:-inset-1.5 after:content-['']"

/** Why a change may not be saved yet, while the player can act on it. */
type RecoveryState = "out-of-date" | "not-saved"

/**
 * The one persistent toast of the Run screens: out of date until the page
 * reloads, else "Not saved yet" while the outcome of a change is unknown.
 */
function RecoveryToast({ outOfDate }: { outOfDate: boolean }) {
  const { status, retryDelivery } = useRun()
  const state: RecoveryState | null = outOfDate
    ? "out-of-date"
    : status.delivery === "uncertain"
      ? "not-saved"
      : null

  // A closed tab loses the changes it has not delivered.
  useLeavePrompt(status.delivery !== "idle")

  useEffect(() => {
    if (!state) return

    const id = `run-recovery-${state}`

    toast.add(
      state === "out-of-date"
        ? {
            id,
            timeout: 0,
            title: "Your app is out of date. Refresh?",
            actionProps: {
              children: "Refresh",
              className: tapTarget,
              onClick: () => window.location.reload(),
            },
          }
        : {
            id,
            timeout: 0,
            title: "Not saved yet. Your changes are kept here.",
            actionProps: {
              children: "Retry",
              className: tapTarget,
              onClick: retryDelivery,
            },
          }
    )

    return () => toast.close(id)
  }, [state, retryDelivery])

  return null
}
