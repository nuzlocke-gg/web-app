import type { Draft } from "immer"

import type {
  CustomPlaceState,
  JourneyState,
  PokemonState,
  RunState,
} from "../state"

// An `apply` runs only on the Run its `check` read (headcanon predicts with
// `check`, then `apply`), so a target its effect names is always there, and
// these lookups throw when it is not.

/**
 * The Journey with this id in a draft of the Run, for an `apply` to change.
 * @throws When the Run has no such Journey.
 */
export function journeyOf(
  draft: Draft<RunState>,
  journeyId: string
): Draft<JourneyState> {
  const journey = draft.journeys.find((candidate) => candidate.id === journeyId)

  if (!journey) throw new Error(`Run ${draft.id} has no Journey ${journeyId}`)

  return journey
}

/**
 * The Pokémon with this id in a draft of the Run, for an `apply` to change.
 * @throws When the Run has no such Journey, or the Journey no such Pokémon.
 */
export function pokemonOf(
  draft: Draft<RunState>,
  target: { journeyId: string; pokemonId: string }
): Draft<PokemonState> {
  const pokemon = journeyOf(draft, target.journeyId).pokemon.find(
    (candidate) => candidate.id === target.pokemonId
  )

  if (!pokemon) {
    throw new Error(
      `Journey ${target.journeyId} has no Pokémon ${target.pokemonId}`
    )
  }

  return pokemon
}

/**
 * The Custom Place with this id in a draft of the Run, for an `apply` to
 * change.
 * @throws When the Run has no such Custom Place.
 */
export function customPlaceOf(
  draft: Draft<RunState>,
  customPlaceId: string
): Draft<CustomPlaceState> {
  const customPlace = draft.customPlaces.find(
    (candidate) => candidate.id === customPlaceId
  )

  if (!customPlace) {
    throw new Error(`Run ${draft.id} has no Custom Place ${customPlaceId}`)
  }

  return customPlace
}
