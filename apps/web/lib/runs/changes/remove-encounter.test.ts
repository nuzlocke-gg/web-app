import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import {
  deepFrozen,
  encounterState,
  journeyState,
  pokemonState,
  runState,
} from "@/test/run-state"

import { removeEncounter } from "../mutations"
import { viewerJourney, type RunState } from "../state"
import { type RemoveEncounterArgs } from "./remove-encounter"

const first = encounterState({ enteredAt: Date.UTC(2026, 9, 1) })
const second = encounterState({
  placeId: "route-102",
  enteredAt: Date.UTC(2026, 9, 2),
})
const third = encounterState({
  placeId: "route-103",
  enteredAt: Date.UTC(2026, 9, 3),
})

function removal(encounterId: string): RemoveEncounterArgs {
  return { runId: runState().id, encounterId }
}

function predict(run: RunState, args: RemoveEncounterArgs) {
  return removeEncounter.predict(run, args, { mutationId: uuidv7() })
}

describe("Remove an Encounter", () => {
  test("deletes the Encounter and its Pokémon and keeps the rest in order", () => {
    const run = runState({
      journeys: [
        journeyState({
          encounters: [first, second, third],
          pokemon: [first, second, third].map((encounter) =>
            pokemonState(encounter)
          ),
        }),
      ],
    })
    const result = predict(run, removal(second.id))

    if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

    const journey = viewerJourney(result.value)

    expect(journey.encounters.map((encounter) => encounter.id)).toEqual([
      first.id,
      third.id,
    ])
    expect(journey.pokemon.map((pokemon) => pokemon.encounterId)).toEqual([
      first.id,
      third.id,
    ])
  })

  test("an Encounter the viewer no longer has is refused as gone", () => {
    expect(predict(runState(), removal(first.id))).toEqual({
      ok: false,
      error: { kind: "gone" },
    })
  })

  test("a Run that is not Active refuses it as run-not-active", () => {
    const run = runState({
      state: "complete",
      journeys: [journeyState({ encounters: [first] })],
    })

    expect(predict(run, removal(first.id))).toEqual({
      ok: false,
      error: { kind: "run-not-active" },
    })
  })

  test("leaves a frozen Run as it was", () => {
    const run = deepFrozen(
      runState({
        journeys: [
          journeyState({
            encounters: [first, second, third],
            pokemon: [first, second, third].map((encounter) =>
              pokemonState(encounter)
            ),
          }),
        ],
      })
    )
    const before = structuredClone(run)

    predict(run, removal(second.id))

    expect(run).toEqual(before)
  })
})
