import { unchanged, type Unchanged } from "headcanon"
import { produce } from "immer"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { deathCause, deathLevel } from "../death"
import { refusal, type RunRefusal } from "../refusals"
import { findViewerPokemon, type RunState } from "../state"
import { pokemonOf } from "./drafts"

/** The arguments of Edit a death: the new level and cause, or none. */
export const editDeathArgs = z.object({
  runId: z.uuid(),
  pokemonId: z.uuid(),
  level: deathLevel.nullable(),
  /** Trimmed by the screen; null for no cause. */
  cause: deathCause.nullable(),
})

/** The arguments of Edit a death. */
export type EditDeathArgs = z.infer<typeof editDeathArgs>

/** The Refusals that {@link check} gives. */
export type EditDeathRefusal = RunRefusal<"run-not-active" | "gone">

/** What Edit a death changes. */
export type EditDeathEffect = {
  journeyId: string
  pokemonId: string
  level: number | null
  cause: string | null
}

/**
 * Decides Edit a death for the viewer's Journey: refused on a Run that is not
 * Active and on a Pokémon that is gone, removed, or living.
 * @returns {@link unchanged} when the death already has this level and cause.
 */
export function check(
  run: RunState,
  args: EditDeathArgs
): Result<EditDeathEffect | Unchanged, EditDeathRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerPokemon(run, args.pokemonId)

  if (
    !found ||
    found.pokemon.removedAt !== null ||
    found.pokemon.diedAt === null
  ) {
    return err(refusal("gone"))
  }

  const { pokemon } = found

  if (pokemon.deathLevel === args.level && pokemon.deathCause === args.cause) {
    return ok(unchanged())
  }

  return ok({
    journeyId: found.journey.id,
    pokemonId: pokemon.id,
    level: args.level,
    cause: args.cause,
  })
}

/** Sets the level and cause of the death; its time stays. */
export function apply(run: RunState, effect: EditDeathEffect): RunState {
  return produce(run, (draft) => {
    const pokemon = pokemonOf(draft, effect)

    pokemon.deathLevel = effect.level
    pokemon.deathCause = effect.cause
  })
}
