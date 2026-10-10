import type { FormRef } from "@workspace/game-data"
import { unchanged } from "headcanon"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { evolutionState, journeyWithPokemon, runState } from "@/test/run-state"

import { evolvePokemon } from "../mutations"
import { viewerJourney, type PokemonState, type RunState } from "../state"
import { check, type EvolvePokemonArgs } from "./evolve-pokemon"

const treecko = { species: "treecko", form: "base" }
const grovyle = { species: "grovyle", form: "base" }
const sceptile = { species: "sceptile", form: "base" }
const mudkip = { species: "mudkip", form: "base" }

/** A solo Run whose viewer has one Pokémon, a Treecko unless overridden. */
function runWith(placement: Partial<PokemonState> = {}): RunState {
  return runState({
    journeys: [journeyWithPokemon([{ species: treecko, ...placement }])],
  })
}

function onlyPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

/** "Next in its line" into `species`, entered at `enteredAt`. */
function next(
  run: RunState,
  species: FormRef,
  enteredAt = Date.UTC(2026, 9, 5)
): EvolvePokemonArgs {
  return {
    runId: run.id,
    pokemonId: onlyPokemon(run).id,
    species,
    pick: { kind: "next", lineId: uuidv7(), enteredAt },
  }
}

/** "Other species": `species`, to correct a wrong one. */
function other(run: RunState, species: FormRef): EvolvePokemonArgs {
  return {
    runId: run.id,
    pokemonId: onlyPokemon(run).id,
    species,
    pick: { kind: "other" },
  }
}

function predict(run: RunState, args: EvolvePokemonArgs) {
  return evolvePokemon.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: EvolvePokemonArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Evolve a Pokémon", () => {
  test("Next in its line sets the Species and adds a line", () => {
    const run = runWith()
    const args = next(run, grovyle)
    const after = onlyPokemon(predicted(run, args))

    expect(after.species).toEqual(grovyle)
    expect(after.evolutions).toEqual([
      {
        id: args.pick.kind === "next" && args.pick.lineId,
        from: treecko,
        to: grovyle,
        enteredAt: Date.UTC(2026, 9, 5),
      },
    ])
  })

  test("lines stay in order of time of entry", () => {
    const first = evolutionState(treecko, grovyle, {
      enteredAt: Date.UTC(2026, 9, 5),
    })
    const run = runWith({ species: grovyle, evolutions: [first] })
    // A device clock behind the first line's.
    const after = onlyPokemon(
      predicted(run, next(run, sceptile, Date.UTC(2026, 9, 4)))
    )

    expect(after.evolutions.map((line) => line.to)).toEqual([sceptile, grovyle])
  })

  test("Other species edits the target of the latest line", () => {
    const first = evolutionState(treecko, grovyle, {
      enteredAt: Date.UTC(2026, 9, 2),
    })
    const latest = evolutionState(grovyle, sceptile, {
      enteredAt: Date.UTC(2026, 9, 3),
    })
    const marshtomp = { species: "marshtomp", form: "base" }
    const run = runWith({ species: sceptile, evolutions: [first, latest] })
    const after = onlyPokemon(predicted(run, other(run, marshtomp)))

    expect(after.species).toEqual(marshtomp)
    expect(after.evolutions).toEqual([first, { ...latest, to: marshtomp }])
  })

  test("Other species back to where the latest line started removes it", () => {
    const line = evolutionState(treecko, grovyle)
    const run = runWith({ species: grovyle, evolutions: [line] })
    const after = onlyPokemon(predicted(run, other(run, treecko)))

    expect(after.species).toEqual(treecko)
    expect(after.evolutions).toEqual([])
  })

  test("Other species with no line sets the Species and adds no line", () => {
    const run = runWith()
    const after = onlyPokemon(predicted(run, other(run, mudkip)))

    expect(after.species).toEqual(mudkip)
    expect(after.evolutions).toEqual([])
  })

  test("the Species and Form it already has is a no-op", () => {
    const run = runWith()

    for (const args of [next(run, treecko), other(run, treecko)]) {
      expect(check(run, args)).toEqual(ok(unchanged()))
      expect(predicted(run, args)).toBe(run)
    }
  })

  test("a replay over a canon that holds the line adds no second line", () => {
    const run = runWith()
    const args = next(run, grovyle)
    const committed = predicted(run, args)

    expect(predicted(committed, args)).toBe(committed)
  })

  test("a dead Pokémon cannot evolve", () => {
    const run = runWith({ diedAt: Date.UTC(2026, 9, 3) })

    for (const args of [next(run, grovyle), other(run, mudkip)]) {
      expect(predict(run, args)).toEqual({
        ok: false,
        error: { kind: "gone" },
      })
    }
  })

  test("a removed Pokémon is refused as gone", () => {
    const run = runWith({ removedAt: Date.UTC(2026, 9, 3) })

    expect(predict(run, next(run, grovyle))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a Run that is not Active refuses it as run-not-active", () => {
    const run = { ...runWith(), state: "failed" as const }

    expect(predict(run, next(run, grovyle))).toEqual({
      ok: false,
      error: { kind: "run-not-active" },
    })
  })
})
