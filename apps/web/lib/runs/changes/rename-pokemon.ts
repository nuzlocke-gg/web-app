import { unchanged, type Unchanged } from "headcanon"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { nickname } from "../nickname"
import { refusal, type RunRefusal } from "../refusals"
import { findViewerPokemon, type RunState } from "../state"
import { withPokemon } from "./with-pokemon"

/** The arguments of Rename a Pokémon. */
export const renamePokemonArgs = z.object({
  runId: z.uuid(),
  pokemonId: z.uuid(),
  /** Trimmed by the screen; null clears the nickname. */
  nickname: nickname.nullable(),
})

/** The arguments of Rename a Pokémon. */
export type RenamePokemonArgs = z.infer<typeof renamePokemonArgs>

/** The Refusals that {@link check} gives. */
export type RenamePokemonRefusal = RunRefusal<"run-not-active" | "gone">

/** What Rename a Pokémon changes. */
export type RenamePokemonEffect = {
  journeyId: string
  pokemonId: string
  nickname: string | null
}

/**
 * Decides Rename a Pokémon for the viewer's Journey, living or dead: refused
 * on a Run that is not Active and on a Pokémon that is gone or removed.
 * @returns {@link unchanged} when the Pokémon already has this nickname.
 */
export function check(
  run: RunState,
  args: RenamePokemonArgs
): Result<RenamePokemonEffect | Unchanged, RenamePokemonRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerPokemon(run, args.pokemonId)

  if (!found || found.pokemon.removedAt !== null) return err(refusal("gone"))

  if (found.pokemon.nickname === args.nickname) return ok(unchanged())

  return ok({
    journeyId: found.journey.id,
    pokemonId: found.pokemon.id,
    nickname: args.nickname,
  })
}

/** Sets the Pokémon's nickname. */
export function apply(run: RunState, effect: RenamePokemonEffect): RunState {
  return withPokemon(run, effect, (pokemon) => ({
    ...pokemon,
    nickname: effect.nickname,
  }))
}
