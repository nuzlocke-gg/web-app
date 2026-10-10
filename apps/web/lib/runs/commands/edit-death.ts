import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { levelInRange } from "../game-data-gate"
import { bumpRevision } from "../lock"
import { editDeath } from "../mutations"
import { refusal } from "../refusals"
import { admitPokemonOwner, screenPlayer } from "./player-access"

/**
 * Sets the level and cause of a dead Pokémon of the actor's Journey. The
 * level and cause it already has are accepted with no new revision.
 */
export const editDeathBinding = runsBinder.bind(editDeath, {
  screen: screenPlayer,
  admit: admitPokemonOwner,
  execute: async ({ tx, state: run, effect, stamp }) => {
    if (
      effect.level !== null &&
      !(await levelInRange(run.mapId, effect.level))
    ) {
      return refuseMutation(refusal("level-out-of-range"))
    }

    await tx
      .update(pokemon)
      .set({ deathLevel: effect.level, deathCause: effect.cause })
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
