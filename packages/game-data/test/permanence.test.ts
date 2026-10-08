import { beforeAll, describe, expect, it } from "vitest"

import { compileMap } from "../src/compile.ts"
import type { CompiledMap, MapSources, ReleaseLock } from "../src/format.ts"
import { checkPermanence, lockFor } from "../src/permanence.ts"
import { compiledFixture, fixtureSources } from "./fixture.ts"

let released: ReleaseLock

beforeAll(async () => {
  released = lockFor(await compiledFixture())
})

/** The fixture after one change, compiled. */
async function compiledAfter(change: (sources: MapSources) => void) {
  const sources = await fixtureSources()

  change(sources)

  const result = compileMap(sources)

  if (!result.ok) throw new Error(result.problems.join("\n"))

  return result.map
}

const check = (map: CompiledMap, frozen = true) =>
  checkPermanence(map, released, { frozen })

describe("the release lock", () => {
  it("lists every released Game, Place, Species with its dex number, and Form", () => {
    expect(released.games).toEqual(["fixture-red", "fixture-blue"])
    expect(released.places).toContain("hatch-town")
    expect(released.species["rattata-alola"]).toBe(19)
    expect(released.forms).toContain("unown/b")
  })

  it("locks a Species whose id is an Object property", async () => {
    const map = await compiledAfter((s) => {
      s.corrections.push({
        op: "add-species",
        species: {
          id: "constructor",
          name: "Constructor",
          dex: 1002,
          forms: [{ id: "base", name: "Constructor", types: ["steel"] }],
        },
      })
    })

    expect(Object.hasOwn(lockFor(map).species, "constructor")).toBe(true)
    expect(lockFor(map).species["constructor"]).toBe(1002)
  })

  it("keeps released ids that a later lock no longer sees", async () => {
    const map = await compiledAfter((s) => {
      s.map.places = s.map.places.filter((p) => p.id !== "hatch-town")
    })

    expect(lockFor(map, released).places).toContain("hatch-town")
  })
})

describe("the permanence check", () => {
  it("passes when nothing is released yet", async () => {
    const map = await compiledAfter((s) => {
      s.map.places = s.map.places.filter((p) => p.id !== "hatch-town")
    })

    expect(checkPermanence(map, undefined, { frozen: true })).toEqual([])
  })

  it("passes a fixed Place name", async () => {
    const map = await compiledAfter((s) => {
      s.map.places.find((p) => p.id === "hatch-town")!.name = "Hatchling Town"
    })

    expect(check(map)).toEqual([])
  })

  it("stops a frozen build for a new Place until the lock has it", async () => {
    const map = await compiledAfter((s) => {
      s.map.places.splice(3, 0, { id: "route-3", name: "Route 3" })
    })

    expect(check(map)).toEqual([
      expect.stringContaining(
        'The lock for "fixture" is out of date: Place "route-3" not locked'
      ),
    ])
    expect(check(map, false)).toEqual([])
    expect(
      checkPermanence(map, lockFor(map, released), { frozen: true })
    ).toEqual([])
  })

  it("stops when a released Place no longer resolves", async () => {
    const map = await compiledAfter((s) => {
      s.map.places = s.map.places.filter((p) => p.id !== "hatch-town")
    })

    expect(check(map, false)).toEqual([
      expect.stringContaining('Released Place "hatch-town" no longer resolves'),
    ])
  })

  it("stops when a released Species id is renamed", async () => {
    const map = await compiledAfter((s) => {
      Object.assign(
        s,
        JSON.parse(
          JSON.stringify(s).replaceAll('"rattata-alola"', '"alolan-rattata"')
        )
      )
    })

    expect(check(map, false)).toEqual([
      'Released Species "rattata-alola" no longer resolves',
      'Released Form "rattata-alola/base" no longer resolves',
    ])
  })

  it("stops when a released Species changes its dex number", async () => {
    const map = await compiledAfter((s) => {
      s.generatedSpecies[0]!.species.find((x) => x.id === "pichu")!.dex = 999
    })

    expect(check(map, false)).toEqual([
      'Released Species "pichu" changed meaning: dex 172 is now 999',
    ])
  })

  it("stops when a released Game leaves the Map", async () => {
    const map = await compiledAfter((s) => {
      s.map.games = s.map.games.filter((g) => g.id !== "fixture-blue")

      for (const p of s.map.places) {
        if (typeof p.name !== "string") p.name = p.name["fixture-red"]!
      }

      for (const area of Object.values(s.generatedWild[0]!.areas)) {
        delete area["fixture-blue"]
      }

      s.oneTime = s.oneTime
        .map((row) => ({
          ...row,
          games: row.games.filter((g) => g !== "fixture-blue"),
        }))
        .filter((row) => row.games.length > 0)
      s.corrections = s.corrections.filter(
        (c) => !("game" in c) || c.game !== "fixture-blue"
      )
    })

    expect(check(map, false)).toEqual([
      'Released Game "fixture-blue" no longer resolves in this Map',
    ])
  })

  it("stops when a released Form no longer resolves", async () => {
    const map = await compiledAfter((s) => {
      const burmy = s.generatedSpecies[0]!.species.find(
        (x) => x.id === "burmy"
      )!
      const wild = s.generatedWild[0]!.areas["cloak-cave-area"]!

      burmy.forms = burmy.forms.filter((f) => f.id !== "trash")
      wild["fixture-blue"] = wild["fixture-blue"]!.filter(
        (r) => r.form !== "trash"
      )
    })

    expect(check(map, false)).toEqual([
      'Released Form "burmy/trash" no longer resolves',
    ])
  })

  it("stops when the lock is for another Map", async () => {
    const map = await compiledFixture()

    expect(
      checkPermanence(map, { ...released, map: "other" }, { frozen: true })
    ).toEqual(['The lock is for Map "other", not "fixture"'])
  })
})
