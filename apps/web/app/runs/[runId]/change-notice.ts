import type { MutationLifecycleError } from "headcanon/react"

import type { RunRefusalKind } from "@/lib/runs/refusals"

/**
 * Why a change to a Run did not save. Its Refusal is read as any `kind`,
 * because a server whose action id survived a deploy can send a kind this
 * build does not know.
 */
export type RunChangeFailure = MutationLifecycleError<{ readonly kind: string }>

/** What the screen tells the player about a change that did not save. */
export type ChangeNotice = {
  title: string
  description: string
  /** Shows the persistent "Your app is out of date. Refresh?" toast. */
  outOfDate: boolean
}

const refusalReasons: Record<RunRefusalKind, string> = {
  "party-full": "Your party already has 6 Pokémon.",
  "slot-taken": "You already have an encounter in this slot.",
  "custom-place-in-use": "This location still has encounters.",
  "unknown-entry": "Your game does not have this species or location.",
  gone: "It was removed or changed.",
  "run-not-active": "This run is not active.",
}

const unknownRefusalReason = "The change was refused."

/**
 * The toast for a change that did not save, or null when the player needs
 * none. It says what happened, never who did it, and never says that a change
 * which may have committed was lost.
 * @param label The change, as "Encounter". Null for a change restored after a
 *   reload, which carries no label.
 */
export function changeNotice(
  failure: RunChangeFailure,
  label: string | null
): ChangeNotice | null {
  const outcome = failureOutcome(failure)

  if (!outcome) return null

  return {
    title: noticeTitle(label, outcome.unconfirmed),
    description: outcome.reason,
    outOfDate: failure.kind === "stale-client",
  }
}

/**
 * Why a failure happened, and whether the change may still have committed.
 * Null for a failure the player needs no word about.
 */
function failureOutcome(
  failure: RunChangeFailure
): { reason: string; unconfirmed: boolean } | null {
  switch (failure.kind) {
    case "domain":
    case "replay-refused":
      return { reason: refusalReason(failure.error), unconfirmed: false }
    case "denied":
      return {
        reason: "You cannot change this run.",
        unconfirmed: failure.mayHaveCommitted,
      }
    case "undeliverable":
      return undeliverableOutcome(failure)
    case "stale-client":
      return { reason: "Refresh to see what was saved.", unconfirmed: true }
    // `delivery-cancelled`: the page is already on its way to sign-in.
    // `root-unmounted`: the player left the Run, and the queue reports the
    // change on the next mount.
    case "delivery-cancelled":
    case "root-unmounted":
      return null
  }
}

function undeliverableOutcome(
  failure: Extract<RunChangeFailure, { kind: "undeliverable" }>
): { reason: string; unconfirmed: boolean } {
  switch (failure.error.code) {
    case "delivery-expired":
      return {
        reason:
          "It was too old to send again. The run now shows what was saved.",
        unconfirmed: true,
      }
    case "delivery-from-future":
      return {
        reason:
          "Your device clock is ahead. Check its date and time, then try again.",
        unconfirmed: failure.mayHaveCommitted,
      }
    default:
      return {
        reason: "Something went wrong. Try again.",
        unconfirmed: failure.mayHaveCommitted,
      }
  }
}

function refusalReason(refusal: { readonly kind: string }): string {
  return Object.hasOwn(refusalReasons, refusal.kind)
    ? refusalReasons[refusal.kind as RunRefusalKind]
    : unknownRefusalReason
}

function noticeTitle(label: string | null, unconfirmed: boolean): string {
  if (label === null) {
    return unconfirmed
      ? "A change made before the page reloaded could not be confirmed."
      : "A change made before the page reloaded was not saved."
  }

  return unconfirmed ? `${label} could not be confirmed` : `${label} not saved`
}
