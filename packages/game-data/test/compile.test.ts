import { describe, expect, it } from "vitest"

import { compileMap } from "../src/compile.ts"
import type { MapSources } from "../src/format.ts"
import { fixtureSources } from "./fixture.ts"

/** Compiles the fixture after one change and gives the problems. */
async function problemsAfter(change: (sources: MapSources) => void) {
  const sources = await fixtureSources()

  change(sources)

  const result = compileMap(sources)

  return result.ok ? [] : result.problems
}

const wild = (s: MapSources) => s.generatedWild[0]!.areas
const species = (s: MapSources, id: string) =>
  s.generatedSpecies[0]!.species.find((x) => x.id === id)!
const place = (s: MapSources, id: string) =>
  s.map.places.find((p) => p.id === id)!

describe("compile", () => {
  it("compiles the fixture Map", async () => {
    expect(await problemsAfter(() => {})).toEqual([])
  })

  it("accepts a ROM hack prefix on a new Species", async () => {
    const problems = await problemsAfter((s) => {
      s.corrections.push({
        op: "add-species",
        species: {
          id: "unbound:foo",
          name: "Foo",
          dex: 1001,
          forms: [{ id: "base", name: "Foo", types: ["normal"] }],
        },
      })
    })

    expect(problems).toEqual([])
  })

  it("collects every problem before it stops", async () => {
    const problems = await problemsAfter((s) => {
      place(s, "hatch-town").id = "route-1"
      species(s, "ivysaur").forms = []
    })

    expect(problems).toEqual([
      'Species "ivysaur" has no Form',
      'Place id "route-1" is used twice',
    ])
  })
})

describe("validation names the bad entry", () => {
  it.each([
    [
      "an unknown Species in a wild row",
      (s: MapSources) =>
        wild(s)["route-1-area"]!["fixture-red"]!.push({
          method: "walk",
          species: "missingno",
          form: "base",
        }),
      'Place "route-1" (fixture-red) names unknown Species or Form "missingno/base"',
    ],
    [
      "an unknown Form in a wild row",
      (s: MapSources) =>
        wild(s)["cloak-cave-area"]!["fixture-blue"]!.push({
          method: "walk",
          species: "burmy",
          form: "gold",
        }),
      'Place "cloak-cave" (fixture-blue) names unknown Species or Form "burmy/gold"',
    ],
    [
      "an unknown Species in a one-time row",
      (s: MapSources) => {
        s.oneTime[0]!.species = "bulbasaurr"
      },
      'Place "starter" (fixture-red) names unknown Species or Form "bulbasaurr/base"',
    ],
    [
      "a duplicate Place id",
      (s: MapSources) => {
        s.map.places.splice(2, 0, { id: "hatch-town", name: "Hatch Town" })
      },
      'Place id "hatch-town" is used twice',
    ],
    [
      "a Map with no Starter Place",
      (s: MapSources) => {
        place(s, "starter").kind = "standard"
      },
      "The Map needs exactly one Starter Place; it has 0",
    ],
    [
      "a Map with two Starter Places",
      (s: MapSources) => {
        place(s, "hatch-town").kind = "starter"
      },
      "The Map needs exactly one Starter Place; it has 2",
    ],
    [
      "a Starter Place that is not first",
      (s: MapSources) => {
        s.map.places.splice(1, 0, s.map.places.shift()!)
      },
      'The Starter Place "starter" must be first in the play order',
    ],
    [
      "an Event Place that is not last",
      (s: MapSources) => {
        s.map.places.push({ id: "route-9", name: "Route 9" })
      },
      'Place "route-9" comes after an Event Place',
    ],
    [
      "a Species with no Form",
      (s: MapSources) => {
        species(s, "ivysaur").forms = []
      },
      'Species "ivysaur" has no Form',
    ],
    [
      "a Form with no types",
      (s: MapSources) => {
        species(s, "wormadam").forms[1]!.types = []
      },
      'Form "wormadam/sandy" needs one or two types; it has 0',
    ],
    [
      "a Form with three types",
      (s: MapSources) => {
        species(s, "pidgey").forms[0]!.types = ["normal", "flying", "fire"]
      },
      'Form "pidgey/base" needs one or two types; it has 3',
    ],
    [
      "a Place with no name for a Game",
      (s: MapSources) => {
        place(s, "black-city").name = { "fixture-red": "Black City" }
      },
      'Place "black-city" has no name for fixture-blue',
    ],
    [
      "a Place named for an unknown Game",
      (s: MapSources) => {
        place(s, "black-city").name = {
          "fixture-red": "Black City",
          "fixture-blue": "White Forest",
          "fixture-green": "Grey Field",
        }
      },
      'Place "black-city" names unknown Game "fixture-green"',
    ],
    [
      "an area that no Place claims",
      (s: MapSources) => {
        wild(s)["route-1-hidden-area"] = {
          "fixture-red": [{ method: "walk", species: "pidgey", form: "base" }],
        }
      },
      'Area "route-1-hidden-area" from the import belongs to no Place',
    ],
    [
      "an area claimed by two Places",
      (s: MapSources) => {
        place(s, "hatch-town").areas = ["route-1-area"]
      },
      'Area "route-1-area" is claimed by "route-1" and "hatch-town"',
    ],
    [
      "an area both claimed and ignored",
      (s: MapSources) => {
        place(s, "hatch-town").areas = ["old-ruins-area"]
      },
      'Area "old-ruins-area" is claimed by "hatch-town" and also ignored',
    ],
    [
      "an importer row in a one-time group",
      (s: MapSources) =>
        wild(s)["route-1-area"]!["fixture-red"]!.push({
          method: "static",
          species: "snorlax",
          form: "base",
        }),
      'Area "route-1-area" has a Static row (snorlax). One-time rows are hand-written only.',
    ],
    [
      "a one-time row in a repeatable group",
      (s: MapSources) => {
        s.oneTime[0]!.method = "walk"
      },
      'One-time row bulbasaur/base at "starter": Walk is not a one-time method',
    ],
    [
      "an id that is not readable",
      (s: MapSources) => {
        place(s, "hatch-town").id = "Hatch Town"
      },
      'Place id "Hatch Town" is not a readable id',
    ],
    [
      "a duplicate Game id",
      (s: MapSources) => {
        s.map.games.push({ ...s.map.games[0]! })
      },
      'Game id "fixture-red" is used twice',
    ],
    [
      "a duplicate method id",
      (s: MapSources) => {
        s.methods.push({ ...s.methods[0]! })
      },
      'Method id "walk" is used twice',
    ],
    [
      "a duplicate Species id in the generated data",
      (s: MapSources) => {
        s.generatedSpecies[0]!.species.push(
          structuredClone(species(s, "pidgey"))
        )
      },
      'Species id "pidgey" is used twice',
    ],
    [
      "a duplicate Form id",
      (s: MapSources) => {
        const burmy = species(s, "burmy")

        burmy.forms.push({ ...burmy.forms[0]! })
      },
      'Form id "burmy/plant" is used twice',
    ],
    [
      "an added evolution link to an unknown Species",
      (s: MapSources) => {
        s.corrections.push({
          op: "add-evolution-link",
          evolutionLink: { from: "eevee", to: "jolteonn" },
        })
      },
      'Correction add-evolution-link eevee>jolteonn: no Species "jolteonn"',
    ],
    [
      "a single Form that is not base",
      (s: MapSources) => {
        species(s, "pidgey").forms[0]!.id = "normal"
      },
      'Species "pidgey" has one Form, so its Form id must be "base", not "normal"',
    ],
    [
      "a hack prefix on an id other than a Species id",
      (s: MapSources) => {
        place(s, "hatch-town").id = "hack:hatch-town"
      },
      'Place id "hack:hatch-town" is not a readable id',
    ],
    [
      "a missing Place name for a Game whose id is an Object property",
      (s: MapSources) => {
        s.map.games.push({
          id: "constructor",
          name: "Constructor",
          monogram: "C",
        })
      },
      'Place "black-city" has no name for constructor',
    ],
    [
      "own-evolution-line on an unknown Species",
      (s: MapSources) => {
        s.corrections.push({
          op: "own-evolution-line",
          species: "shedinjaa",
          why: "typo",
        })
      },
      'Correction own-evolution-line: no Species "shedinjaa"',
    ],
  ])("%s", async (_case, change, problem) => {
    expect(await problemsAfter(change)).toContainEqual(
      expect.stringContaining(problem)
    )
  })
})

describe("a correction whose expectation no longer holds stops the compile", () => {
  it.each([
    [
      "remove-wild when the source fixed the row",
      (s: MapSources) => {
        const area = wild(s)["cloak-cave-area"]!

        area["fixture-red"] = area["fixture-red"]!.filter(
          (r) => r.species !== "electrode"
        )
      },
      "Correction remove-wild cloak-cave-area fixture-red walk:electrode/base: the import no longer has that row",
    ],
    [
      "add-wild when the source has the row",
      (s: MapSources) => {
        s.corrections.push({
          op: "add-wild",
          area: "route-1-area",
          game: "fixture-red",
          row: { method: "walk", species: "pidgey", form: "base" },
        })
      },
      "Correction add-wild route-1-area fixture-red walk:pidgey/base: the import now has that row",
    ],
    [
      "ignore-area when the source dropped the area",
      (s: MapSources) => {
        delete wild(s)["old-ruins-area"]
      },
      'Correction ignore-area "old-ruins-area": the import no longer has that area',
    ],
    [
      "set-types when the source fixed the types",
      (s: MapSources) => {
        species(s, "arceus").forms[1]!.types = ["fire"]
      },
      'Correction set-types "arceus/fire" expects normal, but the import now says fire',
    ],
    [
      "add-form when the source has the Form",
      (s: MapSources) => {
        species(s, "unown").forms.push({
          id: "b",
          name: "Unown B",
          types: ["psychic"],
        })
      },
      'Correction add-form "unown/b": the import now has it',
    ],
    [
      "add-species when the source has the Species",
      (s: MapSources) => {
        s.corrections.push({
          op: "add-species",
          species: structuredClone(species(s, "pidgey")),
        })
      },
      'Correction add-species "pidgey": the import now has it',
    ],
    [
      "add-evolution-link when the source has the link",
      (s: MapSources) => {
        s.generatedSpecies[0]!.evolutionLinks.push({
          from: "rattata-alola",
          to: "raticate-alola",
        })
      },
      "Correction add-evolution-link rattata-alola>raticate-alola: the import now has it",
    ],
    [
      "remove-evolution-link when the source dropped the link",
      (s: MapSources) => {
        const file = s.generatedSpecies[0]!

        file.evolutionLinks = file.evolutionLinks.filter(
          (l) => l.to !== "raticate-alola"
        )
      },
      "Correction remove-evolution-link rattata>raticate-alola: the import no longer has it",
    ],
  ])("%s", async (_case, change, problem) => {
    expect(await problemsAfter(change)).toContainEqual(
      expect.stringContaining(problem)
    )
  })
})
