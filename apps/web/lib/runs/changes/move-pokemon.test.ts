import { unchanged } from "headcanon"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { deepFrozen, journeyWithPokemon, runState } from "@/test/run-state"

import { movePokemon } from "../mutations"
import {
  boxOf,
  partyOf,
  viewerJourney,
  type PokemonState,
  type RunLifeState,
  type RunState,
} from "../state"
import { check, movePokemonArgs, type MovePokemonArgs } from "./move-pokemon"

const DEAD = Date.UTC(2026, 9, 3)

/** A solo Run whose viewer has these Pokémon, in this order. */
function runWith(placements: Partial<PokemonState>[]): RunState {
  return runState({ journeys: [journeyWithPokemon(placements)] })
}

/** A full Party of six and one Pokémon in the Box, the last. */
function fullPartyAndOneInBox(): RunState {
  return runWith([...Array.from({ length: 6 }, () => ({})), { inParty: false }])
}

function pokemonAt(run: RunState, index: number): PokemonState {
  return viewerJourney(run).pokemon[index]!
}

function moves(
  run: RunState,
  ...list: [index: number, to: "party" | "box"][]
): MovePokemonArgs {
  return {
    runId: run.id,
    moves: list.map(([index, to]) => ({
      pokemonId: pokemonAt(run, index).id,
      to,
    })),
  }
}

function predict(run: RunState, args: MovePokemonArgs) {
  return movePokemon.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: MovePokemonArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Move a Pokémon", () => {
  test("moves a Party Pokémon to the Box", () => {
    const run = runWith([{}])

    expect(pokemonAt(predicted(run, moves(run, [0, "box"])), 0).inParty).toBe(
      false
    )
  })

  test("moves a Box Pokémon to a Party with room", () => {
    const run = runWith([{ inParty: false }])

    expect(pokemonAt(predicted(run, moves(run, [0, "party"])), 0).inParty).toBe(
      true
    )
  })

  test("a swap into a full Party keeps six in the Party", () => {
    const run = fullPartyAndOneInBox()
    const after = viewerJourney(
      predicted(run, moves(run, [2, "box"], [6, "party"]))
    )

    expect(partyOf(after)).toHaveLength(6)
    expect(boxOf(after).map((pokemon) => pokemon.id)).toEqual([
      pokemonAt(run, 2).id,
    ])
  })

  test("the order of a swap's moves does not matter", () => {
    const run = fullPartyAndOneInBox()

    expect(
      partyOf(
        viewerJourney(predicted(run, moves(run, [6, "party"], [2, "box"])))
      )
    ).toHaveLength(6)
  })

  test("a seventh in the Party is refused as party-full", () => {
    const run = fullPartyAndOneInBox()

    expect(predict(run, moves(run, [6, "party"]))).toEqual({
      ok: false,
      error: { kind: "party-full" },
    })
  })

  test("a dead Pokémon in the Party leaves room", () => {
    const run = runWith([
      ...Array.from({ length: 5 }, () => ({})),
      { diedAt: DEAD },
      { inParty: false },
    ])

    expect(
      partyOf(viewerJourney(predicted(run, moves(run, [6, "party"]))))
    ).toHaveLength(6)
  })

  test("moves that put every Pokémon where it is are a no-op", () => {
    const run = runWith([{}, { inParty: false }])
    const args = moves(run, [0, "party"], [1, "box"])

    expect(check(run, args)).toEqual(ok(unchanged()))
    expect(predicted(run, args)).toBe(run)
  })

  test.each<[string, Partial<PokemonState>]>([
    ["dead", { diedAt: DEAD }],
    ["removed", { removedAt: DEAD }],
  ])("a %s Pokémon is refused as gone", (_, placement) => {
    const run = runWith([{ inParty: false, ...placement }])

    expect(predict(run, moves(run, [0, "party"]))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a Pokémon the viewer does not have is refused as gone", () => {
    const run = runWith([{}])

    expect(
      predict(run, {
        runId: run.id,
        moves: [{ pokemonId: uuidv7(), to: "box" }],
      })
    ).toEqual({ ok: false, error: { kind: "gone" } })
  })

  test("the args name each Pokémon once and hold at least one move", () => {
    const run = runWith([{}])

    expect(
      movePokemonArgs.safeParse(moves(run, [0, "box"], [0, "party"])).success
    ).toBe(false)
    expect(
      movePokemonArgs.safeParse({ runId: run.id, moves: [] }).success
    ).toBe(false)
  })

  test.each<RunLifeState | null>(["waiting", "failed", "complete", null])(
    "a %s Run refuses it as run-not-active",
    (state) => {
      const run = { ...runWith([{}]), state }

      expect(predict(run, moves(run, [0, "box"]))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test("leaves a frozen Run as it was", () => {
    const run = deepFrozen(fullPartyAndOneInBox())
    const before = structuredClone(run)

    predicted(run, moves(run, [2, "box"], [6, "party"]))

    expect(run).toEqual(before)
  })
})
