import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { evolutions, pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder, type RunTransaction } from "../binder"
import type { EvolvePokemonEffect } from "../changes/evolve-pokemon"
import { passesGameDataGate } from "../game-data-gate"
import { bumpRevision } from "../lock"
import { evolvePokemon } from "../mutations"
import { refusal } from "../refusals"
import { clientTime } from "./client-time"
import { admitPokemonOwner, screenPlayer } from "./player-access"

/**
 * Evolves a Pokémon of the actor's Journey, or corrects its Species. A
 * Species and Form it already has is accepted with no new revision.
 */
export const evolvePokemonBinding = runsBinder.bind(evolvePokemon, {
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

    await writeEffect(tx, effect)
    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})

async function writeEffect(tx: RunTransaction, effect: EvolvePokemonEffect) {
  const { species, line } = effect

  await tx
    .update(pokemon)
    .set({ speciesId: species.species, formId: species.form })
    .where(
      and(
        eq(pokemon.id, effect.pokemonId),
        eq(pokemon.journeyId, effect.journeyId)
      )
    )

  if (!line) return

  const ofThisPokemon = (id: string) =>
    and(eq(evolutions.id, id), eq(evolutions.pokemonId, effect.pokemonId))

  switch (line.kind) {
    case "add":
      await tx.insert(evolutions).values({
        id: line.line.id,
        pokemonId: effect.pokemonId,
        speciesFrom: line.line.from.species,
        formFrom: line.line.from.form,
        speciesTo: line.line.to.species,
        formTo: line.line.to.form,
        enteredAt: clientTime(line.line.enteredAt),
      })
      return
    case "retarget":
      await tx
        .update(evolutions)
        .set({ speciesTo: species.species, formTo: species.form })
        .where(ofThisPokemon(line.id))
      return
    case "remove":
      await tx.delete(evolutions).where(ofThisPokemon(line.id))
      return
  }
}
