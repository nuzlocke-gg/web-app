import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation } from "headcanon/server"

import { pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { undoDeath } from "../mutations"
import { admitPokemonOwner, screenPlayer } from "./player-access"

/**
 * Undoes the death of a Pokémon of the actor's Journey: it lives again where
 * it died, or in the Box when the Party is full.
 */
export const undoDeathBinding = runsBinder.bind(undoDeath, {
  screen: screenPlayer,
  admit: admitPokemonOwner,
  execute: async ({ tx, state: run, effect, stamp }) => {
    await tx
      .update(pokemon)
      .set({
        inParty: effect.inParty,
        diedAt: null,
        deathLevel: null,
        deathCause: null,
      })
      .where(
        and(
          eq(pokemon.id, effect.pokemonId),
          eq(pokemon.journeyId, effect.journeyId)
        )
      )
    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})
