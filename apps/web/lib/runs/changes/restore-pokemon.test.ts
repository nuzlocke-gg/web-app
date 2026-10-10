import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { deepFrozen, journeyWithPokemon, runState } from "@/test/run-state"

import { restorePokemon } from "../mutations"
import {
  boxOf,
  partyOf,
  viewerJourney,
  type PokemonState,
  type RunLifeState,
  type RunState,
} from "../state"
import type { RestorePokemonArgs } from "./restore-pokemon"

const REMOVED_AT = Date.UTC(2026, 9, 3)
const removed = { removedAt: REMOVED_AT }

/** A solo Run whose viewer has these Pokémon; the first is the one restored. */
function runWith(placements: Partial<PokemonState>[]): RunState {
  return runState({ journeys: [journeyWithPokemon(placements)] })
}

function firstPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

function restore(run: RunState): RestorePokemonArgs {
  return { runId: run.id, pokemonId: firstPokemon(run).id }
}

function predict(run: RunState, args: RestorePokemonArgs) {
  return restorePokemon.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: RestorePokemonArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Restore a Pokémon", () => {
  test("returns it to the Party it was removed from", () => {
    const run = runWith([removed])
    const journey = viewerJourney(predicted(run, restore(run)))

    expect(journey.pokemon[0]).toMatchObject({ removedAt: null, inParty: true })
    expect(partyOf(journey)).toHaveLength(1)
  })

  test("returns a Pokémon removed from the Box to the Box", () => {
    const run = runWith([{ ...removed, inParty: false }])

    expect(boxOf(viewerJourney(predicted(run, restore(run))))).toHaveLength(1)
  })

  test("sends it to the Box when the Party filled meanwhile", () => {
    const run = runWith([removed, ...Array.from({ length: 6 }, () => ({}))])
    const journey = viewerJourney(predicted(run, restore(run)))

    expect(journey.pokemon[0]!.inParty).toBe(false)
    expect(partyOf(journey)).toHaveLength(6)
  })

  test("a Pokémon that is not removed is refused as gone", () => {
    const run = runWith([{}])

    expect(predict(run, restore(run))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test.each<RunLifeState | null>(["waiting", "failed", "complete", null])(
    "a %s Run refuses it as run-not-active",
    (state) => {
      const run = { ...runWith([removed]), state }

      expect(predict(run, restore(run))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test("leaves a frozen Run as it was", () => {
    const run = deepFrozen(runWith([removed]))
    const before = structuredClone(run)

    predicted(run, restore(run))

    expect(run).toEqual(before)
  })
})
