import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation } from "headcanon/server"

import { pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { movePokemon } from "../mutations"
import { admitMovedPokemonOwner, screenPlayer } from "./player-access"

/**
 * Moves Pokémon of the actor's Journey between the Party and the Box, all in
 * one change. Moves that change nothing are accepted with no new revision.
 */
export const movePokemonBinding = runsBinder.bind(movePokemon, {
  screen: screenPlayer,
  admit: admitMovedPokemonOwner,
  execute: async ({ tx, state: run, effect, stamp }) => {
    for (const move of effect.moves) {
      await tx
        .update(pokemon)
        .set({ inParty: move.inParty })
        .where(
          and(
            eq(pokemon.id, move.pokemonId),
            eq(pokemon.journeyId, effect.journeyId)
          )
        )
    }
    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})
