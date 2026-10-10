import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import { findViewerPokemon, returnsToParty, type RunState } from "../state"
import { withPokemon } from "./with-pokemon"

/** The arguments of Restore a Pokémon. */
export const restorePokemonArgs = z.object({
  runId: z.uuid(),
  pokemonId: z.uuid(),
})

/** The arguments of Restore a Pokémon. */
export type RestorePokemonArgs = z.infer<typeof restorePokemonArgs>

/** The Refusals that {@link check} gives. */
export type RestorePokemonRefusal = RunRefusal<"run-not-active" | "gone">

/** What Restore a Pokémon changes: it is back, in the Party or the Box. */
export type RestorePokemonEffect = {
  journeyId: string
  pokemonId: string
  inParty: boolean
}

/**
 * Decides Restore a Pokémon for the viewer's Journey: refused on a Run that
 * is not Active and on a Pokémon that is gone or not removed. The Pokémon
 * goes back where it was removed from, or to the Box when the Party filled
 * meanwhile.
 */
export function check(
  run: RunState,
  args: RestorePokemonArgs
): Result<RestorePokemonEffect, RestorePokemonRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerPokemon(run, args.pokemonId)

  if (!found || found.pokemon.removedAt === null) return err(refusal("gone"))

  const { journey, pokemon } = found

  return ok({
    journeyId: journey.id,
    pokemonId: pokemon.id,
    inParty: returnsToParty(journey, pokemon),
  })
}

/** Clears the removal and puts the Pokémon in the Party or the Box. */
export function apply(run: RunState, effect: RestorePokemonEffect): RunState {
  return withPokemon(run, effect, (pokemon) => ({
    ...pokemon,
    inParty: effect.inParty,
    removedAt: null,
  }))
}
