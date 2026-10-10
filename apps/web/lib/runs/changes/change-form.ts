import type { FormRef } from "@workspace/game-data"
import { unchanged, type Unchanged } from "headcanon"
import { produce } from "immer"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import { findViewerPokemon, type RunState } from "../state"
import { pokemonOf } from "./drafts"

/** The arguments of Change the Form of a Pokémon: a Form of its Species. */
export const changeFormArgs = z.object({
  runId: z.uuid(),
  pokemonId: z.uuid(),
  form: z.string().min(1),
})

/** The arguments of Change the Form of a Pokémon. */
export type ChangeFormArgs = z.infer<typeof changeFormArgs>

/** The Refusals that {@link check} gives. */
export type ChangeFormRefusal = RunRefusal<"run-not-active" | "gone">

/** What Change the Form changes: the Pokémon's current Species and Form. */
export type ChangeFormEffect = {
  journeyId: string
  pokemonId: string
  species: FormRef
}

/**
 * Decides Change the Form for the viewer's Journey, living or dead: refused on
 * a Run that is not Active and on a Pokémon that is gone or removed. It leaves
 * no history line.
 * @returns {@link unchanged} when the Pokémon already has this Form.
 */
export function check(
  run: RunState,
  args: ChangeFormArgs
): Result<ChangeFormEffect | Unchanged, ChangeFormRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerPokemon(run, args.pokemonId)

  if (!found || found.pokemon.removedAt !== null) return err(refusal("gone"))

  const { species } = found.pokemon

  if (species.form === args.form) return ok(unchanged())

  return ok({
    journeyId: found.journey.id,
    pokemonId: found.pokemon.id,
    species: { species: species.species, form: args.form },
  })
}

/** Sets the Pokémon's current Form. */
export function apply(run: RunState, effect: ChangeFormEffect): RunState {
  return produce(run, (draft) => {
    pokemonOf(draft, effect).species = effect.species
  })
}
