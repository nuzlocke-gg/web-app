import { unchanged, type Unchanged } from "headcanon"
import { err, ok, type Result } from "serializable-result"
import { z } from "zod"

import { admitsChanges } from "../can-change"
import { refusal, type RunRefusal } from "../refusals"
import {
  partyOf,
  PARTY_SIZE,
  viewerJourney,
  type JourneyState,
  type RunState,
} from "../state"

/**
 * The arguments of Move a Pokémon: moves committed together, each Pokémon
 * named once, such as the two moves of a swap into a full Party.
 */
export const movePokemonArgs = z.object({
  runId: z.uuid(),
  moves: z
    .array(z.object({ pokemonId: z.uuid(), to: z.enum(["party", "box"]) }))
    .min(1)
    .refine(
      (moves) =>
        new Set(moves.map((move) => move.pokemonId)).size === moves.length,
      "Each Pokémon moves once."
    ),
})

/** The arguments of Move a Pokémon. */
export type MovePokemonArgs = z.infer<typeof movePokemonArgs>

/** The Refusals that {@link check} gives. */
export type MovePokemonRefusal = RunRefusal<
  "run-not-active" | "gone" | "party-full"
>

/** What Move a Pokémon changes: the moves that put a Pokémon somewhere new. */
export type MovePokemonEffect = {
  journeyId: string
  moves: { pokemonId: string; inParty: boolean }[]
}

/**
 * Decides Move a Pokémon for the viewer's Journey: refused on a Run that is
 * not Active, when a Pokémon is gone, removed, or dead, and when the moves
 * leave more than six in the Party.
 * @returns {@link unchanged} when every Pokémon is already where it moves.
 */
export function check(
  run: RunState,
  args: MovePokemonArgs
): Result<MovePokemonEffect | Unchanged, MovePokemonRefusal> {
  if (!admitsChanges(run)) return err(refusal("run-not-active"))

  const journey = viewerJourney(run)
  const moves: MovePokemonEffect["moves"] = []

  for (const move of args.moves) {
    const pokemon = journey.pokemon.find(
      (candidate) => candidate.id === move.pokemonId
    )

    // A dead Pokémon cannot move: the target is in the wrong life state.
    if (!pokemon || pokemon.removedAt !== null || pokemon.diedAt !== null) {
      return err(refusal("gone"))
    }

    const inParty = move.to === "party"

    if (pokemon.inParty !== inParty) {
      moves.push({ pokemonId: pokemon.id, inParty })
    }
  }

  if (moves.length === 0) return ok(unchanged())

  const effect = { journeyId: journey.id, moves }

  if (partyOf(withMoves(journey, effect)).length > PARTY_SIZE) {
    return err(refusal("party-full"))
  }

  return ok(effect)
}

/** Puts each moved Pokémon in the Party or the Box. */
export function apply(run: RunState, effect: MovePokemonEffect): RunState {
  return {
    ...run,
    journeys: run.journeys.map((journey) =>
      journey.id === effect.journeyId ? withMoves(journey, effect) : journey
    ),
  }
}

function withMoves(
  journey: JourneyState,
  effect: MovePokemonEffect
): JourneyState {
  const destinations = new Map(
    effect.moves.map((move) => [move.pokemonId, move.inParty])
  )

  return {
    ...journey,
    pokemon: journey.pokemon.map((pokemon) => {
      const inParty = destinations.get(pokemon.id)

      return inParty === undefined ? pokemon : { ...pokemon, inParty }
    }),
  }
}
