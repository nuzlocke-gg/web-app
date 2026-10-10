import { unchanged } from "headcanon"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { journeyWithPokemon, runState } from "@/test/run-state"

import { editDeath } from "../mutations"
import {
  viewerJourney,
  type PokemonState,
  type RunLifeState,
  type RunState,
} from "../state"
import { check, type EditDeathArgs } from "./edit-death"

const DIED_AT = Date.UTC(2026, 9, 3)
const dead = { diedAt: DIED_AT, deathLevel: 14, deathCause: "Crit" }

function runWith(placement: Partial<PokemonState> = dead): RunState {
  return runState({ journeys: [journeyWithPokemon([placement])] })
}

function onlyPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

function edit(
  run: RunState,
  level: number | null,
  cause: string | null
): EditDeathArgs {
  return { runId: run.id, pokemonId: onlyPokemon(run).id, level, cause }
}

function predict(run: RunState, args: EditDeathArgs) {
  return editDeath.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: EditDeathArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Edit a death", () => {
  test("changes the level and cause, and keeps the time of death", () => {
    const run = runWith()

    expect(
      onlyPokemon(predicted(run, edit(run, 24, "Roxanne's Nosepass")))
    ).toMatchObject({
      diedAt: DIED_AT,
      deathLevel: 24,
      deathCause: "Roxanne's Nosepass",
    })
  })

  test("null clears the level and the cause", () => {
    const run = runWith()

    expect(onlyPokemon(predicted(run, edit(run, null, null)))).toMatchObject({
      diedAt: DIED_AT,
      deathLevel: null,
      deathCause: null,
    })
  })

  test("the same level and cause are a no-op", () => {
    const run = runWith()
    const args = edit(run, 14, "Crit")

    expect(check(run, args)).toEqual(ok(unchanged()))
    expect(predicted(run, args)).toBe(run)
  })

  test.each<[string, Partial<PokemonState>]>([
    ["a living Pokémon", {}],
    ["a removed Pokémon", { ...dead, removedAt: DIED_AT }],
  ])("%s is refused as gone", (_, placement) => {
    const run = runWith(placement)

    expect(predict(run, edit(run, 24, null))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test.each<RunLifeState | null>(["waiting", "failed", "complete", null])(
    "a %s Run refuses it as run-not-active",
    (state) => {
      const run = { ...runWith(), state }

      expect(predict(run, edit(run, 24, null))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )
})
