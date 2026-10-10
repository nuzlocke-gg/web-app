import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder } from "../binder"
import { passesGameDataGate } from "../game-data-gate"
import { bumpRevision } from "../lock"
import { changeForm } from "../mutations"
import { refusal } from "../refusals"
import { admitPokemonOwner, screenPlayer } from "./player-access"

/**
 * Changes the Form of a Pokémon of the actor's Journey. A Form it already has
 * is accepted with no new revision.
 */
export const changeFormBinding = runsBinder.bind(changeForm, {
  screen: screenPlayer,
  admit: admitPokemonOwner,
  execute: async ({ tx, state: run, effect, stamp }) => {
    const { gameId } = run.journeys.find(
      (journey) => journey.id === effect.journeyId
    )!
    const known = await passesGameDataGate(run.mapId, gameId, {
      form: effect.species,
    })

    if (!known) return refuseMutation(refusal("unknown-entry"))

    await tx
      .update(pokemon)
      .set({ formId: effect.species.form })
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
