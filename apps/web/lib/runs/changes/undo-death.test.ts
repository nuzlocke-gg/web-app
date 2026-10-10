import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { deepFrozen, journeyWithPokemon, runState } from "@/test/run-state"

import { undoDeath } from "../mutations"
import {
  viewerJourney,
  type PokemonState,
  type RunLifeState,
  type RunState,
} from "../state"
import type { UndoDeathArgs } from "./undo-death"

const DIED_AT = Date.UTC(2026, 9, 3)
const dead = { diedAt: DIED_AT, deathLevel: 14, deathCause: "Crit" }

/** A solo Run whose viewer has these Pokémon; the first is the one undone. */
function runWith(placements: Partial<PokemonState>[]): RunState {
  return runState({ journeys: [journeyWithPokemon(placements)] })
}

function firstPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

function undo(run: RunState): UndoDeathArgs {
  return { runId: run.id, pokemonId: firstPokemon(run).id }
}

function predict(run: RunState, args: UndoDeathArgs) {
  return undoDeath.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: UndoDeathArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Undo a death", () => {
  test("clears the death and returns it to the Party it died in", () => {
    const run = runWith([dead])

    expect(firstPokemon(predicted(run, undo(run)))).toMatchObject({
      inParty: true,
      diedAt: null,
      deathLevel: null,
      deathCause: null,
    })
  })

  test("returns a Pokémon that died in the Box to the Box", () => {
    const run = runWith([{ ...dead, inParty: false }])

    expect(firstPokemon(predicted(run, undo(run))).inParty).toBe(false)
  })

  test("sends it to the Box when the Party filled meanwhile", () => {
    const run = runWith([dead, ...Array.from({ length: 6 }, () => ({}))])

    expect(firstPokemon(predicted(run, undo(run))).inParty).toBe(false)
  })

  test.each<[string, Partial<PokemonState>]>([
    ["a living Pokémon", {}],
    ["a removed Pokémon", { ...dead, removedAt: DIED_AT }],
  ])("%s is refused as gone", (_, placement) => {
    const run = runWith([placement])

    expect(predict(run, undo(run))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test.each<RunLifeState | null>(["waiting", "failed", "complete", null])(
    "a %s Run refuses it as run-not-active",
    (state) => {
      const run = { ...runWith([dead]), state }

      expect(predict(run, undo(run))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test("leaves a frozen Run as it was", () => {
    const run = deepFrozen(runWith([dead]))
    const before = structuredClone(run)

    predicted(run, undo(run))

    expect(run).toEqual(before)
  })
})
