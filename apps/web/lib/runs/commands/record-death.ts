import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { levelInRange } from "../game-data-gate"
import { bumpRevision } from "../lock"
import { recordDeath } from "../mutations"
import { refusal } from "../refusals"
import { clientTime } from "./client-time"
import { admitPokemonOwner, screenPlayer } from "./player-access"

/**
 * Records the death of a living Pokémon of the actor's Journey. It keeps its
 * place in the Party or the Box.
 */
export const recordDeathBinding = runsBinder.bind(recordDeath, {
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
      .set({
        diedAt: clientTime(effect.diedAt),
        deathLevel: effect.level,
        deathCause: effect.cause,
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
