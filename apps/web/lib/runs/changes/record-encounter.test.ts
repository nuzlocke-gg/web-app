import { andThen, ok } from "serializable-result"
import { v7 as uuidv7 } from "uuid"
import { describe, expect, test } from "vitest"

import {
  encounterState,
  journeyState,
  journeyWithPokemon,
  runState,
  viewerJourneyId,
} from "@/test/run-state"

import { recordEncounter } from "../mutations"
import { boxOf, partyOf, viewerJourney, type RunState } from "../state"
import {
  apply,
  check,
  nextSlot,
  type RecordEncounterArgs,
} from "./record-encounter"

function caughtMudkip(
  overrides: Partial<RecordEncounterArgs> = {}
): RecordEncounterArgs {
  return {
    runId: runState().id,
    encounterId: uuidv7(),
    placeId: "starter",
    slot: 1,
    origin: "gift",
    enteredAt: Date.UTC(2026, 9, 2),
    outcome: {
      kind: "caught",
      met: { species: "mudkip", form: "base" },
      pokemonId: uuidv7(),
      nickname: "Muddy",
      goesTo: "party",
    },
    ...overrides,
  }
}

function predict(run: RunState, args: RecordEncounterArgs) {
  return recordEncounter.predict(run, args, { mutationId: uuidv7() })
}

function predicted(run: RunState, args: RecordEncounterArgs): RunState {
  const result = predict(run, args)

  if (!result.ok) throw new Error(`Refused: ${result.error.kind}`)

  return result.value
}

describe("Record an Encounter", () => {
  test("a Caught Encounter makes one Pokémon in the Party", () => {
    const pokemonId = uuidv7()
    const args = caughtMudkip({
      outcome: {
        kind: "caught",
        met: { species: "mudkip", form: "base" },
        pokemonId,
        nickname: "Muddy",
        goesTo: "party",
      },
    })
    const journey = viewerJourney(predicted(runState(), args))

    expect(journey.encounters).toEqual([
      {
        id: args.encounterId,
        placeId: "starter",
        slot: 1,
        origin: "gift",
        outcome: "caught",
        met: { species: "mudkip", form: "base" },
        enteredAt: args.enteredAt,
      },
    ])
    expect(partyOf(journey)).toEqual([
      {
        id: pokemonId,
        encounterId: args.encounterId,
        species: { species: "mudkip", form: "base" },
        nickname: "Muddy",
        inParty: true,
        diedAt: null,
        removedAt: null,
      },
    ])
  })

  test("a catch for a full Party goes to the Box, not a Refusal", () => {
    const run = runState({
      journeys: [journeyWithPokemon(Array.from({ length: 6 }, () => ({})))],
    })
    const journey = viewerJourney(predicted(run, caughtMudkip()))

    expect(partyOf(journey)).toHaveLength(6)
    expect(boxOf(journey).map((pokemon) => pokemon.nickname)).toEqual(["Muddy"])
  })

  test("a dead or removed Pokémon leaves room in the Party", () => {
    const run = runState({
      journeys: [
        journeyWithPokemon([
          ...Array.from({ length: 4 }, () => ({})),
          { diedAt: Date.UTC(2026, 9, 1) },
          { removedAt: Date.UTC(2026, 9, 1) },
        ]),
      ],
    })
    const journey = viewerJourney(predicted(run, caughtMudkip()))

    expect(partyOf(journey)).toHaveLength(5)
    expect(boxOf(journey)).toEqual([])
  })

  test("a Failed Encounter with no Species makes no Pokémon", () => {
    const args = caughtMudkip({ outcome: { kind: "failed" } })
    const journey = viewerJourney(predicted(runState(), args))

    expect(journey.encounters.map((encounter) => encounter.met)).toEqual([null])
    expect(journey.encounters[0]!.outcome).toBe("failed")
    expect(journey.pokemon).toEqual([])
  })

  test("a second Encounter of one Journey in one Slot is refused as slot-taken", () => {
    const run = predicted(runState(), caughtMudkip())

    expect(predict(run, caughtMudkip())).toEqual({
      ok: false,
      error: { kind: "slot-taken" },
    })
    expect(predict(run, caughtMudkip({ slot: 2 })).ok).toBe(true)
  })

  test.each(["waiting", "failed", "complete"] as const)(
    "a %s Run refuses the change as run-not-active",
    (state) => {
      expect(predict(runState({ state }), caughtMudkip())).toEqual({
        ok: false,
        error: { kind: "run-not-active" },
      })
    }
  )

  test("the predictor is check then apply", () => {
    const run = runState({ journeys: [journeyWithPokemon([{}, {}])] })
    const args = caughtMudkip()

    expect(predict(run, args)).toEqual(
      andThen(check(run, args), (effect) => ok(apply(run, effect)))
    )
  })

  test("a backdated Encounter takes its place in the order of entry, with its Pokémon", () => {
    const later = encounterState({ enteredAt: Date.UTC(2026, 9, 5) })
    const run = runState({
      journeys: [
        journeyState({
          encounters: [later],
          pokemon: [
            {
              id: uuidv7(),
              encounterId: later.id,
              species: later.met!,
              nickname: null,
              inParty: true,
              diedAt: null,
              removedAt: null,
            },
          ],
        }),
      ],
    })
    const args = caughtMudkip({ enteredAt: Date.UTC(2026, 9, 2) })
    const journey = viewerJourney(predicted(run, args))

    expect(journey.encounters.map((encounter) => encounter.id)).toEqual([
      args.encounterId,
      later.id,
    ])
    expect(journey.pokemon.map((pokemon) => pokemon.encounterId)).toEqual([
      args.encounterId,
      later.id,
    ])
  })
})

describe("nextSlot", () => {
  test("is 1 at a location with no Encounter", () => {
    expect(nextSlot(runState(), "route-101")).toBe(1)
  })

  test("is one past the highest Slot of any Journey at that location", () => {
    const partner = journeyState({
      id: uuidv7(),
      playerId: uuidv7(),
      encounters: [
        encounterState({ slot: 1 }),
        encounterState({ slot: 2 }),
        encounterState({ placeId: "route-102", slot: 5 }),
      ],
    })
    const run = runState({
      kind: "soul_link",
      journeys: [
        journeyState({ id: viewerJourneyId, encounters: [encounterState()] }),
        partner,
      ],
    })

    expect(nextSlot(run, "route-101")).toBe(3)
  })
})
