// The alternatives are the database enums too (lib/db/schema.ts), so each list
// has one home. Values are only ever added.

/** Solo or Soul Link, fixed at creation (ADR 0004). */
export const runKinds = ["solo", "soul_link"] as const
export type RunKind = (typeof runKinds)[number]

/** Where a Run is in its life. */
export const runLifeStates = [
  "waiting",
  "active",
  "failed",
  "complete",
] as const
export type RunLifeState = (typeof runLifeStates)[number]

/** Who can read a Run: its Players only, or anyone with its link. */
export const runVisibilities = ["private", "link"] as const
export type RunVisibility = (typeof runVisibilities)[number]

/** One Player's part of a Run. */
export type JourneyState = {
  id: string
  playerId: string
  gameId: string
}

/**
 * The canon of `run.v1`: one Run as its screens need it, read for one viewer.
 * The loader makes it; the Run root predicts over it.
 */
export type RunState = {
  id: string
  /** The Player who reads this canon. It keys the root's stored queue. */
  viewerId: string
  name: string
  mapId: string
  kind: RunKind
  state: RunLifeState
  visibility: RunVisibility
  attemptNumber: number
  /** `{ ruleId: on }`; an absent key is Off. */
  rules: Record<string, boolean>
  journeys: JourneyState[]
}

/** The viewer's own Journey. Every canon is read for a Player of the Run. */
export function viewerJourney(run: RunState): JourneyState {
  const journey = run.journeys.find(
    (candidate) => candidate.playerId === run.viewerId
  )

  if (!journey) throw new Error(`Run ${run.id} has no Journey for its viewer`)

  return journey
}
