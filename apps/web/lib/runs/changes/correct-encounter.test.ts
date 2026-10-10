import { andThen, ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import {
  encounterState,
  journeyState,
  pokemonState,
  runState,
} from "@/test/run-state"

import { correctEncounter } from "../mutations"
import {
  viewerJourney,
  type EncounterState,
  type PokemonState,
  type RunState,
} from "../state"
import { apply, check, type CorrectEncounterArgs } from "./correct-encounter"

const partnerId = "0199c4a0-0000-7000-8000-000000000009"

const caught = encounterState({
  met: { species: "treecko", form: "base" },
  origin: "gift",
})
const failed = encounterState({
  placeId: "route-102",
  outcome: "failed",
  met: null,
})

/** A solo Run whose viewer has these Encounters and Pokémon. */
function runWith(encounters: EncounterState[], pokemon: PokemonState[] = []) {
  return runState({ journeys: [journeyState({ encounters, pokemon })] })
}

function correction(
  encounter: EncounterState,
  overrides: Partial<CorrectEncounterArgs> = {}
): CorrectEncounterArgs {
  return {
    runId: runState().id,
    encounterId: encounter.id,
    met: encounter.met,
    origin: encounter.origin ?? "wild",
    ...overrides,
  }
}

function predict(run: RunState, args: CorrectEncounterArgs) {
  return correctEncounter.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: CorrectEncounterArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

function onlyEncounter(run: RunState): EncounterState {
  return viewerJourney(run).encounters[0]!
}

function onlyPokemon(run: RunState): PokemonState {
  return viewerJourney(run).pokemon[0]!
}

describe("Correct an Encounter", () => {
  test("a new Species met moves a Pokémon that still has the old one", () => {
    const run = runWith([caught], [pokemonState(caught)])
    const mudkip = { species: "mudkip", form: "base" }
    const after = predicted(run, correction(caught, { met: mudkip }))

    expect(onlyEncounter(after).met).toEqual(mudkip)
    expect(onlyPokemon(after).species).toEqual(mudkip)
  })

  test("a new Species met leaves a Pokémon whose Species changed", () => {
    const grovyle = { species: "grovyle", form: "base" }
    const run = runWith([caught], [pokemonState(caught, { species: grovyle })])
    const after = predicted(
      run,
      correction(caught, { met: { species: "mudkip", form: "base" } })
    )

    expect(onlyPokemon(after).species).toEqual(grovyle)
  })

  test("a new Form met moves a Pokémon with the old Species and Form", () => {
    const west = encounterState({ met: { species: "shellos", form: "west" } })
    const east = { species: "shellos", form: "east" }
    const after = predicted(
      runWith([west], [pokemonState(west)]),
      correction(west, { met: east })
    )

    expect(onlyPokemon(after).species).toEqual(east)
  })

  test("a new Form met leaves a Pokémon whose Form changed in play", () => {
    const west = encounterState({ met: { species: "shellos", form: "west" } })
    const east = { species: "shellos", form: "east" }
    const run = runWith([west], [pokemonState(west, { species: east })])
    const after = predicted(
      run,
      correction(west, { met: { species: "shellos", form: "north" } })
    )

    expect(onlyEncounter(after).met).toEqual({
      species: "shellos",
      form: "north",
    })
    expect(onlyPokemon(after).species).toEqual(east)
  })

  test("the origin changes alone and the Pokémon stays", () => {
    const pokemon = pokemonState(caught)
    const after = predicted(
      runWith([caught], [pokemon]),
      correction(caught, { origin: "trade" })
    )

    expect(onlyEncounter(after).origin).toBe("trade")
    expect(onlyPokemon(after)).toEqual(pokemon)
  })

  test("a Failed Encounter's Species can be set and cleared", () => {
    const ralts = { species: "ralts", form: "base" }
    const set = predicted(runWith([failed]), correction(failed, { met: ralts }))

    expect(onlyEncounter(set).met).toEqual(ralts)
    expect(onlyEncounter(set).outcome).toBe("failed")
    expect(viewerJourney(set).pokemon).toEqual([])

    const cleared = predicted(
      set,
      correction(onlyEncounter(set), { met: null })
    )

    expect(onlyEncounter(cleared).met).toBeNull()
  })

  test("clearing the Species of a Caught Encounter is refused as gone", () => {
    const run = runWith([caught], [pokemonState(caught)])

    expect(predict(run, correction(caught, { met: null }))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a correction to the values already held is a no-op", () => {
    const run = runWith([caught], [pokemonState(caught)])
    const args = correction(caught)

    expect(check(run, args)).toEqual(ok(null))
    expect(predicted(run, args)).toBe(run)
  })

  test("an Encounter the viewer no longer has is refused as gone", () => {
    expect(predict(runWith([]), correction(caught))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a partner's Encounter is refused as gone", () => {
    const run = runState({
      kind: "soul_link",
      journeys: [
        journeyState(),
        journeyState({
          id: uuidv7(),
          playerId: partnerId,
          encounters: [caught],
        }),
      ],
    })

    expect(predict(run, correction(caught))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test.each(["waiting", "failed", "complete", null] as const)(
    "a %s Run refuses it as run-not-active",
    (state) => {
      const run = runState({
        state,
        journeys: [journeyState({ encounters: [caught] })],
      })

      expect(predict(run, correction(caught))).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test("the predictor is check then apply", () => {
    const run = runWith([caught], [pokemonState(caught)])
    const args = correction(caught, {
      met: { species: "mudkip", form: "base" },
    })

    expect(predict(run, args)).toEqual(
      andThen(check(run, args), (effect) => ok(apply(run, effect)))
    )
  })
})
