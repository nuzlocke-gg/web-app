import { fileURLToPath } from "node:url"
import { beforeAll, describe, expect, it } from "vitest"

import { compileMap } from "../src/compile.ts"
import type { CompiledMap } from "../src/format.ts"
import { checkPermanence } from "../src/permanence.ts"
import {
  createReader,
  dexNumber,
  evolutionLineOf,
  formTypes,
  getForm,
  placesOf,
  progressTotal,
  suggestions,
  toSummary,
  type LoadedMap,
} from "../src/reader.ts"
import { readLock, readMapSources } from "../src/sources.ts"

// The real Emerald Map, compiled from sources/ as the build does.

const packageDir = (path: string) =>
  fileURLToPath(new URL(`../${path}`, import.meta.url))

const GAME = "emerald"

const EVENT_PLACES = [
  "southern-island",
  "faraway-island",
  "birth-island",
  "navel-rock",
]

const ROAMER_ROUTES = [
  110,
  111,
  ...Array.from({ length: 18 }, (_, i) => 117 + i),
]

// Every Static, Gift, and Trade entry, as checked in pokeemerald.
const ONE_TIME = [
  "starter gift treecko",
  "starter gift torchic",
  "starter gift mudkip",
  "littleroot-town gift chikorita",
  "littleroot-town gift cyndaquil",
  "littleroot-town gift totodile",
  "rustboro-city gift lileep",
  "rustboro-city gift anorith",
  "rustboro-city trade seedot",
  "route-119 static kecleon",
  "route-119 gift castform",
  "route-120 static kecleon",
  "fortree-city trade plusle",
  "new-mauville static voltorb",
  "aqua-hideout static electrode",
  "mossdeep-city gift beldum",
  "pacifidlog-town trade horsea",
  "sky-pillar static rayquaza",
  "battle-frontier static sudowoodo",
  "battle-frontier trade meowth",
  "island-cave static regice",
  "desert-ruins static regirock",
  "ancient-tomb static registeel",
  "marine-cave static kyogre",
  "terra-cave static groudon",
  "southern-island static latias",
  "southern-island static latios",
  "faraway-island static mew",
  "birth-island static deoxys",
  "navel-rock static lugia",
  "navel-rock static ho-oh",
]

let compiled: CompiledMap
let map: LoadedMap

beforeAll(async () => {
  const sources = await readMapSources(packageDir("sources"), "emerald")

  if (!sources.ok) throw new Error(sources.error.join("\n"))

  const result = compileMap(sources.value)

  if (!result.ok) throw new Error(result.error.join("\n"))

  compiled = result.value
  map = (await createReader({
    catalog: [toSummary(compiled)],
    load: { emerald: async () => compiled },
  }).loadMap("emerald"))!
})

/** Every entry of every Place as "place method species". */
function entriesOf(methods: string[]): string[] {
  return placesOf(map, GAME).flatMap((place) =>
    suggestions(map, place.id, GAME)
      .filter((group) => methods.includes(group.method))
      .flatMap((group) =>
        group.entries.map(
          (entry) => `${place.id} ${group.method} ${entry.species}`
        )
      )
  )
}

describe("the Emerald Map: Places", () => {
  it("puts the Starter Place first", () => {
    expect(placesOf(map, GAME)[0]).toEqual({
      id: "starter",
      kind: "starter",
      name: "Starter",
    })
  })

  it("puts the Event Places last, and only those", () => {
    const places = placesOf(map, GAME)
    const events = places.filter((p) => p.kind === "event").map((p) => p.id)

    expect(events).toEqual(EVENT_PLACES)
    expect(places.slice(-EVENT_PLACES.length).map((p) => p.id)).toEqual(
      EVENT_PLACES
    )
  })

  it("has every walkable location, and counts all but the Event Places", () => {
    expect(placesOf(map, GAME)).toHaveLength(87)
    expect(progressTotal(map)).toBe(83)
  })

  it("keeps a location with no Pokémon, where an egg can still hatch", () => {
    expect(placesOf(map, GAME)).toContainEqual({
      id: "lavaridge-town",
      kind: "standard",
      name: "Lavaridge Town",
    })
    expect(suggestions(map, "lavaridge-town", GAME)).toEqual([])
  })

  it("has one Underwater Place with the seaweed rows", () => {
    const groups = suggestions(map, "underwater", GAME)

    expect(groups.map((g) => g.method)).toEqual(["surf"])
    expect(groups[0]!.entries).toContainEqual({
      species: "relicanth",
      form: "base",
    })
  })
})

describe("the Emerald Map: encounter tables", () => {
  it("resolves every entry to a Species and Form", () => {
    const unresolved = placesOf(map, GAME).flatMap((place) =>
      suggestions(map, place.id, GAME)
        .flatMap((group) => group.entries)
        .filter((entry) => !getForm(map, entry.species, entry.form))
    )

    expect(unresolved).toEqual([])
  })

  it("has exactly the checked Static, Gift, and Trade entries", () => {
    expect(entriesOf(["static", "gift", "trade"]).sort()).toEqual(
      [...ONE_TIME].sort()
    )
  })

  it("has Latias and Latios roaming on each roamer route, and nowhere else", () => {
    const expected = ROAMER_ROUTES.flatMap((route) => [
      `route-${route} roaming latias`,
      `route-${route} roaming latios`,
    ])

    expect(entriesOf(["roaming"]).sort()).toEqual(expected.sort())
  })

  it("has Feebas in the Route 119 Fishing group", () => {
    const fishing = suggestions(map, "route-119", GAME).find(
      (g) => g.method === "fishing"
    )

    expect(fishing?.entries).toContainEqual({ species: "feebas", form: "base" })
  })

  it("gives the Wild origin to Static and Roaming, Gift and Trade their own", () => {
    const origins = Object.fromEntries(
      suggestions(map, "battle-frontier", GAME).map((g) => [g.method, g.origin])
    )

    expect(origins).toEqual({ static: "wild", trade: "trade" })
  })
})

describe("the Emerald Map: Species", () => {
  it("has the 386 Species of Generation 3, numbered 1 to 386", () => {
    expect(compiled.species.map((s) => dexNumber(map, s.id))).toEqual(
      Array.from({ length: 386 }, (_, i) => i + 1)
    )
  })

  it("has no Fairy type", () => {
    const fairy = compiled.species.filter((s) =>
      s.forms.some((f) => f.types.includes("fairy"))
    )

    expect(fairy).toEqual([])
  })

  it("has the types of Generation 3", () => {
    expect(formTypes(map, "clefairy", "base")).toEqual(["normal"])
    expect(formTypes(map, "azumarill", "base")).toEqual(["water"])
    expect(formTypes(map, "magnemite", "base")).toEqual(["electric", "steel"])
  })

  it("gives Shedinja its own line, and the other lines their earliest Species", () => {
    expect(evolutionLineOf(map, "shedinja")).toBe("shedinja")
    expect(evolutionLineOf(map, "ninjask")).toBe("nincada")
    expect(evolutionLineOf(map, "raichu")).toBe("pichu")
    expect(evolutionLineOf(map, "azumarill")).toBe("azurill")
    expect(evolutionLineOf(map, "dustox")).toBe("wurmple")
    expect(evolutionLineOf(map, "snorlax")).toBe("snorlax")
  })
})

describe("the Emerald Map: release", () => {
  it("passes the permanence check against the committed lock", async () => {
    const lock = await readLock(packageDir("released"), "emerald")

    if (!lock.ok) throw new Error(lock.error.join("\n"))

    expect(lock.value).toBeDefined()
    expect(checkPermanence(compiled, lock.value, { frozen: true })).toEqual([])
  })
})
