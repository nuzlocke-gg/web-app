import { unchanged } from "headcanon"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import {
  deepFrozen,
  journeyState,
  journeyWithPokemon,
  runState,
  viewerId,
} from "@/test/run-state"

import { renamePokemon } from "../mutations"
import {
  viewerJourney,
  type PokemonState,
  type RunLifeState,
  type RunState,
} from "../state"
import { check, type RenamePokemonArgs } from "./rename-pokemon"

const partnerId = "0199c4a0-0000-7000-8000-000000000009"

/** A solo Run whose viewer has one Pokémon. */
function runWith(placement: Partial<PokemonState> = {}): RunState {
  return runState({ journeys: [journeyWithPokemon([placement])] })
}

function onlyPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

function rename(run: RunState, nickname: string | null): RenamePokemonArgs {
  return { runId: run.id, pokemonId: onlyPokemon(run).id, nickname }
}

function predict(run: RunState, args: RenamePokemonArgs) {
  return renamePokemon.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: RenamePokemonArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Rename a Pokémon", () => {
  test("sets the nickname", () => {
    const run = runWith()

    expect(onlyPokemon(predicted(run, rename(run, "Zig"))).nickname).toBe("Zig")
  })

  test("null clears the nickname", () => {
    const run = runWith({ nickname: "Zig" })

    expect(onlyPokemon(predicted(run, rename(run, null))).nickname).toBeNull()
  })

  test("renames a dead Pokémon", () => {
    const run = runWith({ diedAt: Date.UTC(2026, 9, 3) })

    expect(onlyPokemon(predicted(run, rename(run, "Zig"))).nickname).toBe("Zig")
  })

  test("the nickname it already has is a no-op", () => {
    const run = runWith({ nickname: "Zig" })
    const args = rename(run, "Zig")

    expect(check(run, args)).toEqual(ok(unchanged()))
    expect(predicted(run, args)).toBe(run)
  })

  test("a removed Pokémon is refused as gone", () => {
    const run = runWith({ removedAt: Date.UTC(2026, 9, 3) })

    expect(predict(run, rename(run, "Zig"))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a Pokémon the viewer no longer has is refused as gone", () => {
    const run = runWith()
    const args = rename(run, "Zig")
    const emptied = runState({ journeys: [journeyState()] })

    expect(predict(emptied, args)).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a partner's Pokémon is refused as gone", () => {
    const partner = {
      ...journeyWithPokemon([{}]),
      id: uuidv7(),
      playerId: partnerId,
    }
    const run = runState({
      kind: "soul_link",
      journeys: [journeyState(), partner],
    })
    const args = {
      runId: run.id,
      pokemonId: partner.pokemon[0]!.id,
      nickname: "Zig",
    }

    expect(run.viewerId).toBe(viewerId)
    expect(predict(run, args)).toEqual({ ok: false, error: { kind: "gone" } })
  })

  test.each<RunLifeState | null>(["waiting", "failed", "complete", null])(
    "a %s Run refuses it as run-not-active",
    (state) => {
      const run = { ...runWith(), state }

      expect(predict(run, rename(run, "Zig"))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test("leaves a frozen Run as it was", () => {
    const run = deepFrozen(runWith())
    const before = structuredClone(run)

    predicted(run, rename(run, "Zig"))

    expect(run).toEqual(before)
  })
})
