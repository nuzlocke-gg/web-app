import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation } from "headcanon/server"

import { pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { bumpRevision } from "../lock"
import { removePokemon } from "../mutations"
import { clientTime } from "./client-time"
import { admitPokemonOwner, screenPlayer } from "./player-access"

/**
 * Removes a living Pokémon of the actor's Journey, traded away or released.
 * The row stays, so its Encounter and history stay.
 */
export const removePokemonBinding = runsBinder.bind(removePokemon, {
  screen: screenPlayer,
  admit: admitPokemonOwner,
  execute: async ({ tx, state: run, effect, stamp }) => {
    await tx
      .update(pokemon)
      .set({ removedAt: clientTime(effect.removedAt) })
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
