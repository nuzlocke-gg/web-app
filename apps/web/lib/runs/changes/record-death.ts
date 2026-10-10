import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { deathCause, deathLevel } from "../death"
import { refusal, type RunRefusal } from "../refusals"
import { findViewerPokemon, type RunState } from "../state"
import { withPokemon } from "./with-pokemon"

/**
 * The arguments of Record a death. `diedAt` is the client clock in epoch
 * milliseconds, chosen once when the player saves; the server stores the
 * earlier of it and its own clock.
 */
export const recordDeathArgs = z.object({
  runId: z.uuid(),
  pokemonId: z.uuid(),
  diedAt: z.int().nonnegative(),
  level: deathLevel.nullable(),
  /** Trimmed by the screen; null for no cause. */
  cause: deathCause.nullable(),
})

/** The arguments of Record a death. */
export type RecordDeathArgs = z.infer<typeof recordDeathArgs>

/** The Refusals that {@link check} gives. */
export type RecordDeathRefusal = RunRefusal<"run-not-active" | "gone">

/** What Record a death changes. */
export type RecordDeathEffect = {
  journeyId: string
  pokemonId: string
  diedAt: number
  level: number | null
  cause: string | null
}

/**
 * Decides Record a death for the viewer's Journey: refused on a Run that is
 * not Active and on a Pokémon that is gone, removed, or already dead.
 */
export function check(
  run: RunState,
  args: RecordDeathArgs
): Result<RecordDeathEffect, RecordDeathRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerPokemon(run, args.pokemonId)

  if (
    !found ||
    found.pokemon.removedAt !== null ||
    found.pokemon.diedAt !== null
  ) {
    return err(refusal("gone"))
  }

  return ok({
    journeyId: found.journey.id,
    pokemonId: found.pokemon.id,
    diedAt: args.diedAt,
    level: args.level,
    cause: args.cause,
  })
}

/**
 * Marks the Pokémon dead with its level and cause. It keeps its place in the
 * Party or the Box, so Undo a death can return it there.
 */
export function apply(run: RunState, effect: RecordDeathEffect): RunState {
  return withPokemon(run, effect, (pokemon) => ({
    ...pokemon,
    diedAt: effect.diedAt,
    deathLevel: effect.level,
    deathCause: effect.cause,
  }))
}
