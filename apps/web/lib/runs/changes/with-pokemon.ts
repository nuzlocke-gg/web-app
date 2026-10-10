import type { PokemonState, RunState } from "../state"

/**
 * The Run with one Pokémon of one Journey replaced by `change` of it, for the
 * `apply` of a change to a single Pokémon.
 */
export function withPokemon(
  run: RunState,
  target: { journeyId: string; pokemonId: string },
  change: (pokemon: PokemonState) => PokemonState
): RunState {
  return {
    ...run,
    journeys: run.journeys.map((journey) =>
      journey.id === target.journeyId
        ? {
            ...journey,
            pokemon: journey.pokemon.map((pokemon) =>
              pokemon.id === target.pokemonId ? change(pokemon) : pokemon
            ),
          }
        : journey
    ),
  }
}
