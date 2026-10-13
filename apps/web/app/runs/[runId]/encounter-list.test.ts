import { loadMap, type LoadedMap } from "@workspace/game-data"
import { beforeAll, describe, expect, test } from "vitest"

import type { PlaceRef } from "@/lib/runs/place"
import type { EncounterState } from "@/lib/runs/state"
import {
  customPlaceState,
  encounterState,
  journeyState,
  pokemonState,
  runState,
} from "@/test/run-state"

import {
  fateLine,
  listedPlaces,
  locationNameTaken,
  placeChoices,
  progressOf,
  slotCount,
  type LocationRow,
} from "./encounter-list"

function game(id: string): PlaceRef {
  return { kind: "game", id }
}

function row(id: string, kind: LocationRow["kind"], name: string): LocationRow {
  return { place: game(id), kind, name }
}

const starter = row("starter", "starter", "Starter")
const route9 = row("route-9", "standard", "Route 9")
const route10 = row("route-10", "standard", "Route 10")
const cave = row("cave", "standard", "Cerulean Cave")
const navel = row("navel-rock", "event", "Navel Rock")
const places = [starter, route10, route9, cave, navel]

/** A UUID v7 whose time is midnight UTC on that day of October 2026. */
function idOnDay(day: number): string {
  const hex = Date.UTC(2026, 9, day).toString(16).padStart(12, "0")

  return `${hex.slice(0, 8)}-${hex.slice(8)}-7000-8000-000000000000`
}

const linkTrade = customPlaceState({ id: idOnDay(2), name: "Link trade" })
const linkRow: LocationRow = {
  place: { kind: "custom", id: linkTrade.id },
  kind: "custom",
  name: linkTrade.name,
}

/** Three counted locations and the Starter; Navel Rock is an Event Place. */
const total = 4

const partnerId = "0199c4a0-0000-7000-8000-000000000009"

function at(placeId: string, day: number, overrides = {}): EncounterState {
  return encounterState({
    place: { kind: "game", id: placeId },
    enteredAt: Date.UTC(2026, 9, day),
    ...overrides,
  })
}

/** A solo Run whose viewer has these Encounters. */
function runWith(...encounters: EncounterState[]) {
  return runState({ journeys: [journeyState({ encounters })] })
}

function names(list: LocationRow[]): string[] {
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

describe("listedPlaces with a Custom location", () => {
  const withCustom = (...encounters: EncounterState[]) =>
    runState({
      customPlaces: [linkTrade],
      journeys: [journeyState({ encounters })],
    })

  test("a Custom location joins the list when it is added, with no Encounter", () => {
    const run = withCustom(at("starter", 1))

    expect(names(listedPlaces([...places, linkRow], run))).toEqual([
      "Starter",
      "Link trade",
    ])
  })

  test("a Custom location with no Encounter sorts by the time it was added", () => {
    const run = withCustom(at("route-9", 1), at("route-10", 3))

    expect(names(listedPlaces([...places, linkRow], run))).toEqual([
      "Starter",
      "Route 9",
      "Link trade",
      "Route 10",
    ])
  })

  test("a Custom location with an Encounter sorts by its first Encounter", () => {
    const run = withCustom(
      at("route-9", 1),
      at("route-10", 3),
      encounterState({
        place: linkRow.place,
        enteredAt: Date.UTC(2026, 9, 4),
      })
    )

    expect(names(listedPlaces([...places, linkRow], run))).toEqual([
      "Starter",
      "Route 9",
      "Route 10",
      "Link trade",
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

describe("progressOf with a Custom location", () => {
  test("a Custom location makes no cell and is not in the remaining count", () => {
    const run = runState({
      customPlaces: [linkTrade],
      journeys: [
        journeyState({
          encounters: [
            at("route-9", 1),
            encounterState({ place: linkRow.place }),
          ],
        }),
      ],
    })
    const listed = listedPlaces([...places, linkRow], run)

    expect(progressOf(listed, run, total)).toMatchObject({
      cells: ["caught"],
      done: 1,
      remaining: 3,
    })
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

  test("the Custom locations come last, in a group of their own, in both views", () => {
    const run = runState({ customPlaces: [linkTrade] })
    const custom = { title: "Custom locations", places: ["Link trade"] }
    const titles = (view: "remaining" | "all") =>
      placeChoices([...places, linkRow], run, view, "").map((group) => ({
        title: group.title,
        places: names(group.places),
      }))

    expect(titles("remaining").at(-1)).toEqual(custom)
    expect(titles("all").at(-1)).toEqual(custom)
    expect(titles("all")[0]!.places).not.toContain("Link trade")
  })

  test("a search finds a Custom location", () => {
    const run = runState({ customPlaces: [linkTrade] })

    expect(
      placeChoices([...places, linkRow], run, "all", "link").map((group) =>
        names(group.places)
      )
    ).toEqual([["Link trade"]])
  })

  test("a search with no match gives no groups", () => {
    expect(groups(runWith(), "all", "viridian")).toEqual([])
  })
})

describe("locationNameTaken", () => {
  const locations = [...places, linkRow]

  test.each([
    ["a location of the Game, in any letter case", "route 9"],
    ["a Custom location, trimmed", "  LINK TRADE "],
  ])("is true for %s", (_, name) => {
    expect(locationNameTaken(locations, name)).toBe(true)
  })

  test("is false for a new name", () => {
    expect(locationNameTaken(locations, "Bonus disc")).toBe(false)
  })

  test("lets a Custom location keep its own name in another letter case", () => {
    expect(locationNameTaken(locations, "LINK TRADE", linkRow.place)).toBe(
      false
    )
  })
})

describe("slotCount", () => {
  test("is the number of Slots the viewer has at a location", () => {
    const run = runWith(
      at("route-9", 1, { slot: 1 }),
      at("route-9", 2, { slot: 2 }),
      at("route-10", 3)
    )

    expect(slotCount(run, game("route-9"))).toBe(2)
    expect(slotCount(run, game("route-10"))).toBe(1)
    expect(slotCount(run, game("cave"))).toBe(0)
  })

  test("counts a Slot that partners share once", () => {
    const run = runState({
      kind: "soul_link",
      journeys: [
        journeyState({ encounters: [at("route-9", 1)] }),
        journeyState({
          id: "0199c4a0-0000-7000-8000-00000000000a",
          playerId: partnerId,
          encounters: [at("route-9", 2), at("route-9", 3, { slot: 2 })],
        }),
      ],
    })

    expect(slotCount(run, game("route-9"))).toBe(2)
  })

  test("counts the Slots left after a removal leaves a gap", () => {
    const run = runWith(at("route-9", 2, { slot: 2 }))

    expect(slotCount(run, game("route-9"))).toBe(1)
  })
})

describe("fateLine", () => {
  let map: LoadedMap

  beforeAll(async () => {
    map = (await loadMap("emerald"))!
  })

  const treecko = encounterState({ met: { species: "treecko", form: "base" } })
  const grovyle = { species: "grovyle", form: "base" }

  test.each([
    ["the nickname and the Party", { nickname: "Leafy" }, "Leafy · Party"],
    ["no nickname and the Box", { inParty: false }, "No nickname · Box"],
    [
      "the current Species once it differs from the met one",
      { nickname: "Leafy", species: grovyle },
      "Leafy · now Grovyle · Party",
    ],
    [
      "the level of a death",
      { nickname: "Leafy", diedAt: Date.UTC(2026, 9, 3), deathLevel: 24 },
      "Leafy · died at Lv 24",
    ],
    [
      "a death with no level",
      { nickname: "Leafy", diedAt: Date.UTC(2026, 9, 3) },
      "Leafy · died",
    ],
    [
      "a removed Pokémon",
      { nickname: "Leafy", removedAt: Date.UTC(2026, 9, 4) },
      "Leafy · Removed",
    ],
    [
      "an evolved Pokémon that died",
      {
        nickname: "Leafy",
        species: grovyle,
        diedAt: Date.UTC(2026, 9, 3),
        deathLevel: 24,
      },
      "Leafy · now Grovyle · died at Lv 24",
    ],
  ])("says %s", (_, overrides, line) => {
    expect(fateLine(map, treecko, pokemonState(treecko, overrides))).toBe(line)
  })

  test("says Failed for a Failed Encounter", () => {
    const failed = encounterState({ outcome: "failed", met: null })

    expect(fateLine(map, failed, undefined)).toBe("Failed")
  })
})
