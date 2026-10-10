import type { PlaceRow } from "@workspace/game-data"
import { describe, expect, test } from "vitest"

import type { EncounterState } from "@/lib/runs/state"
import { encounterState, journeyState, runState } from "@/test/run-state"

import { listedPlaces, placeChoices, progressOf } from "./encounter-list"

const starter: PlaceRow = { id: "starter", kind: "starter", name: "Starter" }
const route9: PlaceRow = { id: "route-9", kind: "standard", name: "Route 9" }
const route10: PlaceRow = { id: "route-10", kind: "standard", name: "Route 10" }
const cave: PlaceRow = { id: "cave", kind: "standard", name: "Cerulean Cave" }
const navel: PlaceRow = { id: "navel-rock", kind: "event", name: "Navel Rock" }
const places = [starter, route10, route9, cave, navel]

/** Three counted locations and the Starter; Navel Rock is an Event Place. */
const total = 4

const partnerId = "0199c4a0-0000-7000-8000-000000000009"

function at(placeId: string, day: number, overrides = {}): EncounterState {
  return encounterState({
    placeId,
    enteredAt: Date.UTC(2026, 9, day),
    ...overrides,
  })
}

/** A solo Run whose viewer has these Encounters. */
function runWith(...encounters: EncounterState[]) {
  return runState({ journeys: [journeyState({ encounters })] })
}

function names(list: PlaceRow[]): string[] {
  return list.map((place) => place.name)
}

describe("listedPlaces", () => {
  test("a new Run lists only the Starter location", () => {
    expect(names(listedPlaces(places, runWith()))).toEqual(["Starter"])
  })

  test("a location joins at the end with its first Encounter", () => {
    const run = runWith(at("starter", 1), at("route-10", 2), at("route-9", 3))

    expect(names(listedPlaces(places, run))).toEqual([
      "Starter",
      "Route 10",
      "Route 9",
    ])
  })

  test("the Starter stays first when another location has an older Encounter", () => {
    const run = runWith(at("route-9", 1), at("starter", 2))

    expect(names(listedPlaces(places, run))).toEqual(["Starter", "Route 9"])
  })

  test("removing the first Encounter at a location moves it to the time of its next one", () => {
    const before = runWith(
      at("route-10", 1),
      at("route-9", 2),
      at("route-10", 3, { slot: 2 })
    )
    const after = runWith(at("route-9", 2), at("route-10", 3, { slot: 2 }))

    expect(names(listedPlaces(places, before))).toEqual([
      "Starter",
      "Route 10",
      "Route 9",
    ])
    expect(names(listedPlaces(places, after))).toEqual([
      "Starter",
      "Route 9",
      "Route 10",
    ])
  })

  test("a partner's earlier Encounter orders a location in one shared list", () => {
    const run = runState({
      journeys: [
        journeyState({ encounters: [at("route-9", 2), at("route-10", 3)] }),
        journeyState({
          id: "0199c4a0-0000-7000-8000-00000000000a",
          playerId: partnerId,
          encounters: [at("route-10", 1)],
        }),
      ],
    })

    expect(names(listedPlaces(places, run))).toEqual([
      "Starter",
      "Route 10",
      "Route 9",
    ])
  })
})

describe("progressOf", () => {
  function progress(...encounters: EncounterState[]) {
    const run = runWith(...encounters)

    return progressOf(listedPlaces(places, run), run, total)
  }

  test("a new Run has no cells and every location remaining", () => {
    expect(progress()).toEqual({
      cells: [],
      caught: 0,
      failed: 0,
      unknown: 0,
      done: 0,
      remaining: 4,
      total: 4,
    })
  })

  test("a location recorded before the Starter makes the only cell", () => {
    const result = progress(at("route-9", 1))

    expect(result.cells).toEqual(["caught"])
    expect(result.done).toBe(1)
  })

  test("a location with a Caught and a Failed Encounter is a Caught cell", () => {
    const result = progress(
      at("route-9", 1, { outcome: "failed", slot: 1 }),
      at("route-9", 2, { slot: 2 })
    )

    expect(result.cells).toEqual(["caught"])
  })

  test("a location where every Encounter failed is a Failed cell", () => {
    const result = progress(
      at("starter", 1),
      at("route-9", 2, { outcome: "failed", met: null })
    )

    expect(result.cells).toEqual(["caught", "failed"])
    expect(result).toMatchObject({ caught: 1, failed: 1, remaining: 2 })
  })

  test("an outcome a newer build stored is an Unknown cell that counts", () => {
    const result = progress(at("route-9", 1, { outcome: null }))

    expect(result).toMatchObject({ cells: ["unknown"], unknown: 1, done: 1 })
  })

  test("the remaining count leaves out Event Places", () => {
    const result = progress(at("starter", 1), at("navel-rock", 2))

    expect(result.cells).toEqual(["caught"])
    expect(result).toMatchObject({ done: 1, remaining: 3, total: 4 })
  })
})

describe("placeChoices", () => {
  function groups(
    run = runWith(),
    view: "remaining" | "all" = "remaining",
    query = ""
  ) {
    return placeChoices(places, run, view, query).map((group) => ({
      title: group.title,
      places: names(group.places),
    }))
  }

  test("Remaining sorts Route 9 before Route 10, then the Event locations", () => {
    expect(groups()).toEqual([
      {
        title: "No encounter yet",
        places: ["Cerulean Cave", "Route 9", "Route 10", "Starter"],
      },
      { title: "Event locations", places: ["Navel Rock"] },
    ])
  })

  test("Remaining leaves out a location with an Encounter", () => {
    expect(groups(runWith(at("route-9", 1), at("navel-rock", 2)))).toEqual([
      {
        title: "No encounter yet",
        places: ["Cerulean Cave", "Route 10", "Starter"],
      },
    ])
  })

  test("All lists every location A to Z", () => {
    expect(groups(runWith(at("route-9", 1)), "all")).toEqual([
      {
        title: "All locations",
        places: [
          "Cerulean Cave",
          "Navel Rock",
          "Route 9",
          "Route 10",
          "Starter",
        ],
      },
    ])
  })

  test("a search on Remaining finds a location that has an Encounter", () => {
    expect(groups(runWith(at("route-9", 1)), "remaining", "route")).toEqual([
      { title: "Results", places: ["Route 9", "Route 10"] },
    ])
  })

  test("a search with no match gives no groups", () => {
    expect(groups(runWith(), "all", "viridian")).toEqual([])
  })
})
