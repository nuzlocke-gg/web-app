import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import { findViewerPokemon, type RunState } from "../state"
import { withPokemon } from "./with-pokemon"

/**
 * The arguments of Remove a Pokémon, for a trade or a release. `removedAt` is
 * the client clock in epoch milliseconds, chosen once when the player saves;
 * the server stores the earlier of it and its own clock.
 */
export const removePokemonArgs = z.object({
  runId: z.uuid(),
  pokemonId: z.uuid(),
  removedAt: z.int().nonnegative(),
})

/** The arguments of Remove a Pokémon. */
export type RemovePokemonArgs = z.infer<typeof removePokemonArgs>

/** The Refusals that {@link check} gives. */
export type RemovePokemonRefusal = RunRefusal<"run-not-active" | "gone">

/** What Remove a Pokémon changes. */
export type RemovePokemonEffect = {
  journeyId: string
  pokemonId: string
  removedAt: number
}

/**
 * Decides Remove a Pokémon for the viewer's Journey: refused on a Run that is
 * not Active and on a Pokémon that is gone, already removed, or dead (a dead
 * Pokémon is neither traded nor released).
 */
export function check(
  run: RunState,
  args: RemovePokemonArgs
): Result<RemovePokemonEffect, RemovePokemonRefusal> {
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
    removedAt: args.removedAt,
  })
}

/**
 * Marks the Pokémon removed. It leaves the Party, Box, and Graveyard, and
 * keeps its Encounter and history.
 */
export function apply(run: RunState, effect: RemovePokemonEffect): RunState {
  return withPokemon(run, effect, (pokemon) => ({
    ...pokemon,
    removedAt: effect.removedAt,
  }))
}
