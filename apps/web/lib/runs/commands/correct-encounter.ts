import "server-only"

import { and, eq } from "drizzle-orm"
import { acceptMutation, refuseMutation } from "headcanon/server"

import { encounters, pokemon } from "@/lib/db/schema"

import { runAxis } from "../axis"
import { runsBinder, type RunTransaction } from "../binder"
import * as correctEncounterChange from "../changes/correct-encounter"
import { passesGameDataGate } from "../game-data-gate"
import { bumpRevision } from "../lock"
import { correctEncounter } from "../mutations"
import { refusal } from "../refusals"
import { admitEncounterOwner, screenPlayer } from "./player-access"

/**
 * Corrects an Encounter of the actor's Journey. The shared `check` decides it
 * over the locked Run, the game-data gate checks the new Species, and the rows
 * are written from the Effect. A correction to the values already held is
 * accepted unchanged, with no new revision.
 */
export const correctEncounterBinding = runsBinder.bind(correctEncounter, {
  screen: screenPlayer,
  admit: admitEncounterOwner,
  execute: async ({ tx, args, evidence, stamp }) => {
    const { run } = evidence
    const checked = correctEncounterChange.check(run, args)

    if (!checked.ok) return refuseMutation(checked.error)

    const effect = checked.value

    if (!effect) return acceptMutation({ unchanged: true })

    const { gameId } = run.journeys.find(
      (journey) => journey.id === effect.journeyId
    )!
    const known = await passesGameDataGate(run.mapId, gameId, {
      form: effect.met ?? undefined,
    })

    if (!known) return refuseMutation(refusal("unknown-entry"))

    await writeEffect(tx, effect)
    stamp.record(runAxis.of(run.id), await bumpRevision(tx, run.id))

    return acceptMutation()
  },
})

async function writeEffect(
  tx: RunTransaction,
  effect: correctEncounterChange.CorrectEncounterEffect
) {
  await tx
    .update(encounters)
    .set({
      speciesId: effect.met?.species ?? null,
      formId: effect.met?.form ?? null,
      origin: effect.origin,
    })
    .where(
      and(
        eq(encounters.id, effect.encounterId),
        eq(encounters.journeyId, effect.journeyId)
      )
    )

  if (!effect.pokemon) return

  await tx
    .update(pokemon)
    .set({
      speciesId: effect.pokemon.species.species,
      formId: effect.pokemon.species.form,
    })
    .where(
      and(
        eq(pokemon.id, effect.pokemon.id),
        eq(pokemon.journeyId, effect.journeyId)
      )
    )
}
