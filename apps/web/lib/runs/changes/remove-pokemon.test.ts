import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { deepFrozen, journeyWithPokemon, runState } from "@/test/run-state"

import { historyOf } from "../history"
import { removeEncounter, removePokemon } from "../mutations"
import {
  boxOf,
  graveyardOf,
  partyOf,
  viewerJourney,
  type PokemonState,
  type RunLifeState,
  type RunState,
} from "../state"
import type { RemovePokemonArgs } from "./remove-pokemon"

const REMOVED_AT = Date.UTC(2026, 9, 3)

function runWith(placement: Partial<PokemonState> = {}): RunState {
  return runState({ journeys: [journeyWithPokemon([placement])] })
}

function onlyPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

function removal(run: RunState): RemovePokemonArgs {
  return {
    runId: run.id,
    pokemonId: onlyPokemon(run).id,
    removedAt: REMOVED_AT,
  }
}

function predict(run: RunState, args: RemovePokemonArgs) {
  return removePokemon.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: RemovePokemonArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Remove a Pokémon", () => {
  test.each([true, false])(
    "takes it out of the Party, Box, and Graveyard (in the Party: %s)",
    (inParty) => {
      const run = runWith({ inParty })
      const after = predicted(run, removal(run))
      const journey = viewerJourney(after)

      expect(onlyPokemon(after).removedAt).toBe(REMOVED_AT)
      expect([
        ...partyOf(journey),
        ...boxOf(journey),
        ...graveyardOf(journey),
      ]).toEqual([])
    }
  )

  test("keeps its Encounter and its history", () => {
    const run = runWith()
    const journey = viewerJourney(predicted(run, removal(run)))
    const encounter = journey.encounters[0]!

    expect(journey.encounters).toEqual(viewerJourney(run).encounters)
    expect(historyOf(encounter, journey.pokemon[0]!)).toEqual(
      historyOf(encounter, onlyPokemon(run))
    )
  })

  test("its Encounter can still be removed, and the Pokémon goes with it", () => {
    const run = runWith()
    const removed = predicted(run, removal(run))
    const encounterId = viewerJourney(removed).encounters[0]!.id
    const result = removeEncounter.predict(
      removed,
      { runId: run.id, encounterId },
      { mutationId: uuidv7() }
    )

    expect(result.ok && viewerJourney(result.value).pokemon).toEqual([])
  })

  test.each<[string, Partial<PokemonState>]>([
    ["a dead Pokémon", { diedAt: REMOVED_AT }],
    ["a removed Pokémon", { removedAt: REMOVED_AT }],
  ])("%s is refused as gone", (_, placement) => {
    const run = runWith(placement)

    expect(predict(run, removal(run))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test.each<RunLifeState | null>(["waiting", "failed", "complete", null])(
    "a %s Run refuses it as run-not-active",
    (state) => {
      const run = { ...runWith(), state }

      expect(predict(run, removal(run))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test("leaves a frozen Run as it was", () => {
    const run = deepFrozen(runWith())
    const before = structuredClone(run)

    predicted(run, removal(run))

    expect(run).toEqual(before)
  })
})
