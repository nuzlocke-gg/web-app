import { v7 as uuidv7 } from "uuid"

import type {
  EncounterState,
  JourneyState,
  PokemonState,
  RunState,
} from "@/lib/runs/state"

/** The viewer of every fixture Run. */
export const viewerId = "0199c4a0-0000-7000-8000-000000000001"

/** The viewer's Journey in every fixture Run. */
export const viewerJourneyId = "0199c4a0-0000-7000-8000-000000000002"

/** An Active solo Emerald Run with one empty Journey for {@link viewerId}. */
export function runState(overrides: Partial<RunState> = {}): RunState {
  return {
    id: "0199c4a0-0000-7000-8000-000000000003",
    viewerId,
    name: "Emerald Hardcore",
    mapId: "emerald",
    kind: "solo",
    state: "active",
    visibility: "private",
    attemptNumber: 1,
    rules: {},
    journeys: [journeyState()],
    ...overrides,
  }
}

/** The viewer's empty Emerald Journey. */
export function journeyState(
  overrides: Partial<JourneyState> = {}
): JourneyState {
  return {
    id: viewerJourneyId,
    playerId: viewerId,
    gameId: "emerald",
    encounters: [],
    pokemon: [],
    ...overrides,
  }
}

/** A Caught Encounter of a Zigzagoon on Route 101, Slot 1. */
export function encounterState(
  overrides: Partial<EncounterState> = {}
): EncounterState {
  return {
    id: uuidv7(),
    placeId: "route-101",
    slot: 1,
    origin: "wild",
    outcome: "caught",
    met: { species: "zigzagoon", form: "base" },
    enteredAt: Date.UTC(2026, 9, 1),
    ...overrides,
  }
}

/** A living Party Pokémon from the given Encounter. */
export function pokemonState(
  encounter: EncounterState,
  overrides: Partial<PokemonState> = {}
): PokemonState {
  return {
    id: uuidv7(),
    encounterId: encounter.id,
    species: encounter.met ?? { species: "zigzagoon", form: "base" },
    nickname: null,
    inParty: true,
    diedAt: null,
    removedAt: null,
    ...overrides,
  }
}

/**
 * The viewer's Journey with one Caught Encounter and Pokémon per entry of
 * `placements`, each on its own Route 1xx, entered a minute apart.
 */
export function journeyWithPokemon(
  placements: Partial<PokemonState>[]
): JourneyState {
  const encounters = placements.map((_, index) =>
    encounterState({
      placeId: `route-${101 + index}`,
      enteredAt: Date.UTC(2026, 9, 1, 0, index),
    })
  )

  return journeyState({
    encounters,
    pokemon: placements.map((placement, index) =>
      pokemonState(encounters[index]!, placement)
    ),
  })
}
