import { beforeAll, describe, expect, it } from "vitest"

import type { CompiledMap } from "../src/format.ts"
import {
  createReader,
  dexNumber,
  evolutionLineOf,
  formTypes,
  getForm,
  getGame,
  getSpecies,
  hasFormChoice,
  nextInLine,
  placeName,
  placesOf,
  primaryType,
  progressTotal,
  searchSpecies,
  suggestions,
  typesOf,
  type LoadedMap,
  type MapRegistry,
} from "../src/reader.ts"
import { compiledFixture, fixtureSources } from "./fixture.ts"

const RED = "fixture-red"
const BLUE = "fixture-blue"

function registryOf(maps: CompiledMap[]): MapRegistry {
  return {
    catalog: maps.map(
      ({ id, name, region, generation, releaseOrder, games }) => ({
        id,
        name,
        region,
        generation,
        releaseOrder,
        games,
      })
    ),
    load: Object.fromEntries(maps.map((m) => [m.id, async () => m])),
  }
}

let map: LoadedMap
let later: LoadedMap
let reader: ReturnType<typeof createReader>

beforeAll(async () => {
  const compiled = [
    await compiledFixture("fixture-later"),
    await compiledFixture(),
  ]

  reader = createReader(registryOf(compiled))
  map = (await reader.loadMap("fixture"))!
  later = (await reader.loadMap("fixture-later"))!
})

describe("Maps", () => {
  it("lists the Maps in release order", () => {
    expect(reader.listMaps().map((m) => m.id)).toEqual([
      "fixture",
      "fixture-later",
    ])
  })

  it("loads a Map once", async () => {
    expect(await reader.loadMap("fixture")).toBe(map)
  })

  it("reads an unknown Map as unknown", async () => {
    expect(await reader.loadMap("nowhere")).toBeUndefined()
    expect(await reader.loadMap("constructor")).toBeUndefined()
  })

  it("gives a Game its name and monogram", () => {
    expect(getGame(map, RED)).toEqual({
      id: RED,
      name: "Fixture Red",
      monogram: "FR",
    })
  })
})

describe("Places", () => {
  it("lists Places in play order with the Starter Place first and the Event Place last", () => {
    const places = placesOf(map, RED)

    expect(places.map((p) => p.id)).toEqual([
      "starter",
      "route-1",
      "route-2",
      "black-city",
      "trade-house",
      "magma-hideout",
      "cloak-cave",
      "hatch-town",
      "navel-rock",
    ])
    expect(places[0]!.kind).toBe("starter")
    expect(places.at(-1)!.kind).toBe("event")
  })

  it("names a counterpart Place per Game", () => {
    expect(placeName(map, "black-city", RED)).toBe("Black City")
    expect(placeName(map, "black-city", BLUE)).toBe("White Forest")
    expect(
      placesOf(map, BLUE).find((p) => p.id === "magma-hideout")!.name
    ).toBe("Aqua Hideout")
  })

  it("counts every Place except Event Places for Progress", () => {
    expect(progressTotal(map)).toBe(8)
  })
})

describe("suggestions", () => {
  const groups = (place: string, game: string) =>
    suggestions(map, place, game).map((g) => ({
      method: g.method,
      origin: g.origin,
      entries: g.entries.map((e) => `${e.species}/${e.form}`),
    }))

  it("merges a Place's source areas into method groups with Roaming last", () => {
    expect(groups("route-2", RED)).toEqual([
      {
        method: "walk",
        origin: "wild",
        entries: ["pikachu/base", "nincada/base"],
      },
      { method: "surf", origin: "wild", entries: ["tentacool/base"] },
      { method: "fishing", origin: "wild", entries: ["magikarp/base"] },
      { method: "roaming", origin: "wild", entries: ["raikou/base"] },
    ])
  })

  it("gives each Game its own table", () => {
    expect(groups("route-2", BLUE)[0]!.entries).toEqual([
      "nincada/base",
      "pichu/base",
    ])
  })

  it("gives Gift and Trade groups their default origins", () => {
    expect(groups("trade-house", RED)).toEqual([
      { method: "gift", origin: "gift", entries: ["lapras/base"] },
      { method: "trade", origin: "trade", entries: ["farfetchd/base"] },
    ])
    expect(groups("starter", BLUE)).toEqual([
      {
        method: "gift",
        origin: "gift",
        entries: ["bulbasaur/base", "charmander/base", "squirtle/base"],
      },
    ])
  })

  it("puts a roaming Species in the Roaming group of each route", () => {
    for (const place of ["route-1", "route-2"]) {
      expect(groups(place, BLUE).at(-1)).toEqual({
        method: "roaming",
        origin: "wild",
        entries: ["raikou/base"],
      })
    }
  })

  it("gives Static encounters per Game", () => {
    expect(groups("magma-hideout", RED)[0]!.entries).toEqual(["snorlax/base"])
    expect(groups("magma-hideout", BLUE)[0]!.entries).toEqual([
      "electrode/base",
    ])
    expect(groups("navel-rock", BLUE)).toEqual([
      { method: "static", origin: "wild", entries: ["ho-oh/base"] },
    ])
  })

  it("applies corrections to the wild rows", () => {
    expect(groups("cloak-cave", RED)).toEqual([
      {
        method: "walk",
        origin: "wild",
        entries: ["burmy/plant", "burmy/sandy", "unown/a"],
      },
      { method: "rock-smash", origin: "wild", entries: ["voltorb/base"] },
    ])
  })

  it("is empty for a Place with no table", () => {
    expect(suggestions(map, "hatch-town", RED)).toEqual([])
  })
})

describe("Species", () => {
  it("has every Species of the sources in National Dex order", async () => {
    const sources = await fixtureSources()
    const ids = sources.generatedSpecies.flatMap((f) =>
      f.species.map((s) => s.id)
    )
    const dex = map.data.species.map((s) => s.dex)

    expect(map.data.species.map((s) => s.id).sort()).toEqual(ids.sort())
    expect(dex).toEqual([...dex].sort((a, b) => a - b))
  })

  it("gives National Dex numbers, shared by a Regional Variant", () => {
    expect(dexNumber(map, "pikachu")).toBe(25)
    expect(dexNumber(map, "rattata-alola")).toBe(19)
    expect(dexNumber(map, "rattata")).toBe(19)
  })

  it("searches by name, ignoring case, accents, and punctuation", () => {
    const names = (query: string) => searchSpecies(map, query).map((s) => s.id)

    expect(names("farfetch'd")).toEqual(["farfetchd"])
    expect(names("FARFÉTCHD")).toEqual(["farfetchd"])
    expect(names("ho oh")).toEqual(["ho-oh"])
    expect(names("rattata")).toEqual(["rattata", "rattata-alola"])
  })

  it("searches by the start of the dex number", () => {
    expect(searchSpecies(map, "25").map((s) => s.id)).toEqual([
      "pikachu",
      "ho-oh",
    ])
    expect(searchSpecies(map, "0025").map((s) => s.id)).toEqual([
      "pikachu",
      "ho-oh",
    ])
  })

  it("gives every Species for an empty search", () => {
    expect(searchSpecies(map, " ")).toHaveLength(map.data.species.length)
  })
})

describe("Forms and types", () => {
  it("gives Forms that differ in type their own types", () => {
    expect(formTypes(map, "wormadam", "plant")).toEqual(["bug", "grass"])
    expect(formTypes(map, "wormadam", "sandy")).toEqual(["bug", "ground"])
    expect(primaryType(map, "wormadam", "trash")).toBe("bug")
  })

  it("offers a Form choice only for a Species with several Forms", () => {
    expect(hasFormChoice(map, "burmy")).toBe(true)
    expect(hasFormChoice(map, "pikachu")).toBe(false)
    expect(getSpecies(map, "burmy")!.forms.map((f) => f.id)).toEqual([
      "plant",
      "sandy",
      "trash",
    ])
  })

  it("includes a Form added by a correction", () => {
    expect(getForm(map, "unown", "b")).toEqual({
      id: "b",
      name: "Unown B",
      types: ["psychic"],
    })
  })

  it("uses the types a correction sets", () => {
    expect(formTypes(map, "arceus", "fire")).toEqual(["fire"])
    expect(formTypes(map, "arceus", "base")).toEqual(["normal"])
  })

  it("gives types per Map", () => {
    expect(primaryType(map, "clefairy", "base")).toBe("normal")
    expect(primaryType(later, "clefairy", "base")).toBe("fairy")
  })

  it("lists the types of the Map in the games' order", () => {
    expect(typesOf(map)).toEqual([
      "normal",
      "fire",
      "water",
      "electric",
      "grass",
      "ice",
      "poison",
      "ground",
      "flying",
      "psychic",
      "bug",
      "ghost",
      "dark",
      "steel",
    ])
  })
})

describe("Evolution Lines", () => {
  it("names a line by its earliest Species", () => {
    expect(evolutionLineOf(map, "raichu")).toBe("pichu")
    expect(evolutionLineOf(map, "pikachu")).toBe("pichu")
    expect(evolutionLineOf(map, "mothim")).toBe("burmy")
  })

  it("follows the links for a Regional Variant", () => {
    expect(evolutionLineOf(map, "raichu-alola")).toBe("pichu")
  })

  it("follows a hand-written link override", () => {
    expect(evolutionLineOf(map, "raticate-alola")).toBe("rattata-alola")
    expect(evolutionLineOf(map, "raticate")).toBe("rattata")
  })

  it("puts Shedinja on its own line", () => {
    expect(evolutionLineOf(map, "shedinja")).toBe("shedinja")
    expect(evolutionLineOf(map, "ninjask")).toBe("nincada")
  })

  it("gives the next Species in a line, keeping the Form when the target has it", () => {
    expect(nextInLine(map, "burmy", "sandy")).toEqual([
      { species: "wormadam", form: "sandy" },
      { species: "mothim", form: "base" },
    ])
    expect(nextInLine(map, "rattata")).toEqual([
      { species: "raticate", form: "base" },
    ])
    expect(nextInLine(map, "raichu")).toEqual([])
  })
})

describe("unknown identifiers read as unknown", () => {
  it("for a Game", () => {
    for (const game of ["fixture-green", "constructor", "__proto__"]) {
      expect(getGame(map, game)).toBeUndefined()
      expect(placesOf(map, game)).toEqual([])
      expect(placeName(map, "route-1", game)).toBeUndefined()
      expect(suggestions(map, "route-1", game)).toEqual([])
    }
  })

  it("for a Place", () => {
    expect(placeName(map, "nowhere", RED)).toBeUndefined()
    expect(suggestions(map, "nowhere", RED)).toEqual([])
  })

  it("for a Species", () => {
    expect(getSpecies(map, "missingno")).toBeUndefined()
    expect(hasFormChoice(map, "missingno")).toBe(false)
    expect(nextInLine(map, "missingno")).toEqual([])
    expect(evolutionLineOf(map, "missingno")).toBeUndefined()
    expect(dexNumber(map, "missingno")).toBeUndefined()
    expect(primaryType(map, "missingno", "base")).toBeUndefined()
  })

  it("for a Form", () => {
    expect(getForm(map, "burmy", "missing")).toBeUndefined()
    expect(formTypes(map, "burmy", "missing")).toBeUndefined()
    expect(primaryType(map, "burmy", "missing")).toBeUndefined()
    expect(nextInLine(map, "burmy", "missing")).toEqual([])
  })
})
