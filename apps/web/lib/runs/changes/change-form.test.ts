import { unchanged } from "headcanon"
import { ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import { journeyWithPokemon, runState } from "@/test/run-state"

import { changeForm } from "../mutations"
import { viewerJourney, type PokemonState, type RunState } from "../state"
import { check, type ChangeFormArgs } from "./change-form"

const plantCloak = { species: "burmy", form: "plant" }

/** A solo Run whose viewer has one Burmy in its Plant Cloak. */
function runWith(placement: Partial<PokemonState> = {}): RunState {
  return runState({
    journeys: [journeyWithPokemon([{ species: plantCloak, ...placement }])],
  })
}

function onlyPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

function toForm(run: RunState, form: string): ChangeFormArgs {
  return { runId: run.id, pokemonId: onlyPokemon(run).id, form }
}

function predict(run: RunState, args: ChangeFormArgs) {
  return changeForm.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: ChangeFormArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Change the Form", () => {
  test("sets the Form and keeps the Species, with no history line", () => {
    const run = runWith()
    const after = onlyPokemon(predicted(run, toForm(run, "sandy")))

    expect(after.species).toEqual({ species: "burmy", form: "sandy" })
    expect(after.evolutions).toEqual([])
  })

  test("changes the Form of a dead Pokémon", () => {
    const run = runWith({ diedAt: Date.UTC(2026, 9, 3) })

    expect(onlyPokemon(predicted(run, toForm(run, "trash"))).species.form).toBe(
      "trash"
    )
  })

  test("the Form it already has is a no-op", () => {
    const run = runWith()
    const args = toForm(run, "plant")

    expect(check(run, args)).toEqual(ok(unchanged()))
    expect(predicted(run, args)).toBe(run)
  })

  test("a removed Pokémon is refused as gone", () => {
    const run = runWith({ removedAt: Date.UTC(2026, 9, 3) })

    expect(predict(run, toForm(run, "sandy"))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a Run that is not Active refuses it as run-not-active", () => {
    const run = { ...runWith(), state: "complete" as const }

    expect(predict(run, toForm(run, "sandy"))).toEqual({
      ok: false,
      error: { kind: "run-not-active" },
    })
  })
})
