import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { deepFrozen, journeyWithPokemon, runState } from "@/test/run-state"

import { recordDeath } from "../mutations"
import {
  graveyardOf,
  viewerJourney,
  type PokemonState,
  type RunLifeState,
  type RunState,
} from "../state"
import { recordDeathArgs, type RecordDeathArgs } from "./record-death"

const DIED_AT = Date.UTC(2026, 9, 3)

function runWith(placement: Partial<PokemonState> = {}): RunState {
  return runState({ journeys: [journeyWithPokemon([placement])] })
}

function onlyPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

function death(
  run: RunState,
  details: Partial<RecordDeathArgs> = {}
): RecordDeathArgs {
  return {
    runId: run.id,
    pokemonId: onlyPokemon(run).id,
    diedAt: DIED_AT,
    level: 24,
    cause: "Roxanne's Nosepass",
    ...details,
  }
}

function predict(run: RunState, args: RecordDeathArgs) {
  return recordDeath.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: RecordDeathArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Record a death", () => {
  test("marks the Pokémon dead with its time, level, and cause", () => {
    const run = runWith()
    const after = predicted(run, death(run))

    expect(onlyPokemon(after)).toMatchObject({
      diedAt: DIED_AT,
      deathLevel: 24,
      deathCause: "Roxanne's Nosepass",
    })
    expect(graveyardOf(viewerJourney(after))).toHaveLength(1)
  })

  test("the level and cause are optional", () => {
    const run = runWith()

    expect(
      onlyPokemon(predicted(run, death(run, { level: null, cause: null })))
    ).toMatchObject({ diedAt: DIED_AT, deathLevel: null, deathCause: null })
  })

  test.each([true, false])(
    "keeps in_party as it was at death (%s)",
    (inParty) => {
      const run = runWith({ inParty })

      expect(onlyPokemon(predicted(run, death(run))).inParty).toBe(inParty)
    }
  )

  test("a Pokémon that is already dead is refused as gone", () => {
    const run = runWith({ diedAt: DIED_AT })

    expect(predict(run, death(run))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a removed Pokémon is refused as gone", () => {
    const run = runWith({ removedAt: DIED_AT })

    expect(predict(run, death(run))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test.each<[string, Partial<RecordDeathArgs>]>([
    ["a cause with surrounding spaces", { cause: " Crit " }],
    ["an empty cause", { cause: "" }],
    ["a 141-character cause", { cause: "a".repeat(141) }],
    ["level 0", { level: 0 }],
    ["a fractional level", { level: 2.5 }],
  ])("the args refuse %s", (_, details) => {
    const run = runWith()

    expect(recordDeathArgs.safeParse(death(run, details)).success).toBe(false)
  })

  test("the args take a level above 100 for the server to check", () => {
    const run = runWith()

    expect(recordDeathArgs.safeParse(death(run, { level: 250 })).success).toBe(
      true
    )
  })

  test.each<RunLifeState | null>(["waiting", "failed", "complete", null])(
    "a %s Run refuses it as run-not-active",
    (state) => {
      const run = { ...runWith(), state }

      expect(predict(run, death(run))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test("leaves a frozen Run as it was", () => {
    const run = deepFrozen(runWith())
    const before = structuredClone(run)

    predicted(run, death(run))

    expect(run).toEqual(before)
  })
})
