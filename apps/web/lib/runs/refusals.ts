import { z } from "zod"

/**
 * Every kind of Refusal of `run.v1`. Kinds are only ever added, because
 * stored receipts replay them.
 * - `party-full`: a seventh Pokémon in the Party.
 * - `slot-taken`: a second Encounter of one Journey in one Slot.
 * - `custom-place-in-use`: a Custom Place removed while it has Encounters.
 * - `unknown-entry`: a Place, Species, or Form that the Journey's Game does
 *   not have. The server alone decides it.
 * - `gone`: the target of the change no longer exists, or is in the wrong
 *   life state (a death recorded on a dead Pokémon).
 * - `run-not-active`: the Run is Waiting for players or Finished.
 */
export const runRefusalKinds = [
  "party-full",
  "slot-taken",
  "custom-place-in-use",
  "unknown-entry",
  "gone",
  "run-not-active",
] as const

/** One kind of Refusal of `run.v1`. */
export type RunRefusalKind = (typeof runRefusalKinds)[number]

/**
 * A change to a Run that the app does not save. Tagged by `kind`, so a kind
 * can carry detail later.
 */
export type RunRefusal<Kind extends RunRefusalKind = RunRefusalKind> = {
  kind: Kind
}

/** A Refusal of one kind. */
export function refusal<Kind extends RunRefusalKind>(
  kind: Kind
): RunRefusal<Kind> {
  return { kind }
}

/**
 * The synchronous `refusal` schema of one mutation: the kinds its prediction
 * and its server command can refuse with.
 * @example
 * defineMutation({ …, refusal: refusalSchema("slot-taken", "unknown-entry") })
 */
export function refusalSchema<
  const Kinds extends readonly [RunRefusalKind, ...RunRefusalKind[]],
>(...kinds: Kinds) {
  return z.object({ kind: z.enum(kinds) })
}
