import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation } from "headcanon/server"

import { pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { renamePokemon } from "../mutations"
import { admitPokemonOwner, screenPlayer } from "./player-access"

/**
 * Renames a Pokémon of the actor's Journey. A rename to the nickname it
 * already has is accepted with no new revision.
 */
export const renamePokemonBinding = runsBinder.bind(renamePokemon, {
  screen: screenPlayer,
  admit: admitPokemonOwner,
  execute: async ({ tx, state: run, effect, stamp }) => {
    await tx
      .update(pokemon)
      .set({ nickname: effect.nickname })
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
