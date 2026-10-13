import { loadMap, type LoadedMap } from "@workspace/game-data"
import { beforeAll, describe, expect, test } from "vitest"

import { defaultRules } from "@/lib/runs/rules"
import type { EncounterState, RunState } from "@/lib/runs/state"
import { computeWarnings, gameFactsOf } from "@/lib/runs/warnings"
import {
  customPlaceState,
  encounterState,
  journeyState,
  pokemonState,
  runState,
} from "@/test/run-state"

import { warningText } from "./warning-text"

let map: LoadedMap

beforeAll(async () => {
  map = (await loadMap("emerald"))!
})

function met(placeId: string, species: string | null, minute: number) {
  return encounterState({
    place: { kind: "game", id: placeId },
    met: species ? { species, form: "base" } : null,
    outcome: species ? "caught" : "failed",
    enteredAt: Date.UTC(2026, 9, 1, 0, minute),
  })
}

function runOf(
  encounters: EncounterState[],
  nicknames: (string | null)[]
): RunState {
  const caught = encounters.filter((encounter) => encounter.met)

  return runState({
    rules: { ...defaultRules(), "duplicate-clause": true },
    journeys: [
      journeyState({
        encounters,
        pokemon: caught.map((encounter, index) =>
          pokemonState(encounter, { nickname: nicknames[index] ?? null })
        ),
      }),
    ],
  })
}

function textsOf(run: RunState) {
  return computeWarnings(run, gameFactsOf(map)).map((warning) =>
    warningText(map, run, warning)
  )
}

describe("warningText", () => {
  test("names the first Encounter at the location", () => {
    const run = runOf(
      [met("route-104", "taillow", 1), met("route-104", "marill", 2)],
      ["Swoop", "Bubbles"]
    )

    expect(textsOf(run)).toEqual([
      {
        rule: "First Encounter Rule",
        text: "Route 104 already has an encounter: Taillow.",
        where: "Route 104",
      },
    ])
  })

  test("names a Custom location by its name", () => {
    const linkTrade = customPlaceState({ name: "Link trade" })
    const atLinkTrade = (species: string, minute: number) => ({
      ...met("starter", species, minute),
      place: { kind: "custom" as const, id: linkTrade.id },
    })
    const run = {
      ...runOf(
        [atLinkTrade("abra", 1), { ...atLinkTrade("ralts", 2), slot: 2 }],
        ["Spoon", null]
      ),
      customPlaces: [linkTrade],
    }

    expect(textsOf(run)[0]).toMatchObject({
      text: "Link trade already has an encounter: Abra.",
      where: "Link trade",
    })
  })

  test("a first Encounter with no Species is named by its location alone", () => {
    const run = runOf(
      [met("route-104", null, 1), met("route-104", "marill", 2)],
      ["Bubbles"]
    )

    expect(textsOf(run)[0]!.text).toBe("Route 104 already has an encounter.")
  })

  test("names the earlier Pokémon of the line by its nickname and location", () => {
    const run = runOf(
      [met("route-101", "poochyena", 1), met("route-103", "poochyena", 2)],
      ["Fang", "Shade"]
    )

    expect(textsOf(run)).toEqual([
      {
        rule: "Duplicate Clause",
        text: "Poochyena is in the same evolution line as Fang (Route 101).",
        where: "Route 103",
      },
    ])
  })

  test("says which Species has no nickname, or 'It' before a save", () => {
    const run = runOf([met("route-116", "nincada", 1)], [null])
    const [warning] = computeWarnings(run, gameFactsOf(map))

    expect(warningText(map, run, warning!).text).toBe(
      "Nincada has no nickname."
    )
    expect(warningText(map, run, warning!, "record").text).toBe(
      "It has no nickname yet."
    )
  })
})
