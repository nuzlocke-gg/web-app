import { ORIGINS, type FormRef, type Origin } from "@workspace/game-data"
import { unchanged, type Unchanged } from "headcanon"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import {
  findViewerEncounter,
  type EncounterState,
  type JourneyState,
  type PokemonState,
  type RunState,
} from "../state"
import { formRefArgs, sameForm } from "./form-ref"

/**
 * The arguments of Correct an Encounter: the Species, Form, and origin met
 * that the Encounter should hold, all of them, not only what changed.
 */
export const correctEncounterArgs = z.object({
  runId: z.uuid(),
  encounterId: z.uuid(),
  /** Null clears the Species, which only a Failed Encounter may do. */
  met: formRefArgs.nullable(),
  origin: z.enum(ORIGINS),
})

/** The arguments of Correct an Encounter. */
export type CorrectEncounterArgs = z.infer<typeof correctEncounterArgs>

/** The Refusals that {@link check} gives. */
export type CorrectEncounterRefusal = RunRefusal<"run-not-active" | "gone">

/** What Correct an Encounter changes. */
export type CorrectEncounterEffect = {
  journeyId: string
  encounterId: string
  met: FormRef | null
  origin: Origin
  /** The Encounter's Pokémon with the Species and Form it takes, if it follows. */
  pokemon: { id: string; species: FormRef } | null
}

/**
 * Decides Correct an Encounter for the viewer's Journey: refused on a Run that
 * is not Active, on an Encounter the Journey no longer has, and on clearing
 * the Species of an Encounter that is not Failed.
 * @returns {@link unchanged} when the Encounter already holds these values.
 */
export function check(
  run: RunState,
  args: CorrectEncounterArgs
): Result<CorrectEncounterEffect | Unchanged, CorrectEncounterRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const found = findViewerEncounter(run, args.encounterId)

  if (!found) return err(refusal("gone"))

  const { journey, encounter } = found

  // Only a Failed Encounter may have no Species: the target is in the wrong
  // state, as a death recorded on a dead Pokémon is.
  if (!args.met && encounter.outcome !== "failed") return err(refusal("gone"))

  if (sameForm(encounter.met, args.met) && encounter.origin === args.origin) {
    return ok(unchanged())
  }

  const pokemon = journey.pokemon.find(
    (candidate) => candidate.encounterId === encounter.id
  )

  return ok({
    journeyId: journey.id,
    encounterId: encounter.id,
    met: args.met,
    origin: args.origin,
    pokemon:
      pokemon && args.met && follows(pokemon, encounter, args.met)
        ? { id: pokemon.id, species: args.met }
        : null,
  })
}

/**
 * Whether the Pokémon takes the corrected Species and Form met: never once it
 * has an evolution line; after a new Species when it still has the old one;
 * after a new Form only when it still has the old Species and Form, so a Form
 * changed in play stays.
 */
function follows(
  pokemon: PokemonState,
  encounter: EncounterState,
  corrected: FormRef
): boolean {
  const met = encounter.met

  if (!met || pokemon.evolutions.length > 0) return false

  if (corrected.species !== met.species) {
    return pokemon.species.species === met.species
  }

  return corrected.form !== met.form && sameForm(pokemon.species, met)
}

/** Sets the Encounter's Species, Form, and origin met, and its Pokémon's when it follows. */
export function apply(run: RunState, effect: CorrectEncounterEffect): RunState {
  return {
    ...run,
    journeys: run.journeys.map((journey) =>
      journey.id === effect.journeyId ? withEffect(journey, effect) : journey
    ),
  }
}

function withEffect(
  journey: JourneyState,
  effect: CorrectEncounterEffect
): JourneyState {
  const encounters = journey.encounters.map((encounter) =>
    encounter.id === effect.encounterId
      ? { ...encounter, met: effect.met, origin: effect.origin }
      : encounter
  )
  const { pokemon: follower } = effect
  const pokemon = follower
    ? journey.pokemon.map((candidate) =>
        candidate.id === follower.id
          ? { ...candidate, species: follower.species }
          : candidate
      )
    : journey.pokemon

  return { ...journey, encounters, pokemon }
}
