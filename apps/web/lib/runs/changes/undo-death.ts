import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import { findViewerPokemon, returnsToParty, type RunState } from "../state"
import { withPokemon } from "./with-pokemon"

/** The arguments of Undo a death. */
export const undoDeathArgs = z.object({
  runId: z.uuid(),
  pokemonId: z.uuid(),
})

/** The arguments of Undo a death. */
export type UndoDeathArgs = z.infer<typeof undoDeathArgs>

/** The Refusals that {@link check} gives. */
export type UndoDeathRefusal = RunRefusal<"run-not-active" | "gone">

/** What Undo a death changes: the Pokémon lives again, in the Party or the Box. */
export type UndoDeathEffect = {
  journeyId: string
  pokemonId: string
  inParty: boolean
}

/**
 * Decides Undo a death for the viewer's Journey: refused on a Run that is not
 * Active and on a Pokémon that is gone, removed, or living. The Pokémon goes
 * back where it died, or to the Box when the Party filled meanwhile.
 */
export function check(
  run: RunState,
  args: UndoDeathArgs
): Result<UndoDeathEffect, UndoDeathRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerPokemon(run, args.pokemonId)

  if (
    !found ||
    found.pokemon.removedAt !== null ||
    found.pokemon.diedAt === null
  ) {
    return err(refusal("gone"))
  }

  const { journey, pokemon } = found

  return ok({
    journeyId: journey.id,
    pokemonId: pokemon.id,
    inParty: returnsToParty(journey, pokemon),
  })
}

/** Clears the death and puts the Pokémon in the Party or the Box. */
export function apply(run: RunState, effect: UndoDeathEffect): RunState {
  return withPokemon(run, effect, (pokemon) => ({
    ...pokemon,
    inParty: effect.inParty,
    diedAt: null,
    deathLevel: null,
    deathCause: null,
  }))
}
