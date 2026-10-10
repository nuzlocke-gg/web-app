import type { Species, SuggestionGroup } from "@workspace/game-data"
import { describe, expect, test } from "vitest"

import { evolveGroups, searchChoices, speciesGroups } from "./species-choices"

function species(id: string, name: string, forms = ["base"]): Species {
  return {
    id,
    name,
    dex: 0,
    forms: forms.map((form) => ({ id: form, name, types: ["normal"] })),
    evolvesTo: [],
    evolutionLine: id,
  }
}

const zigzagoon = species("zigzagoon", "Zigzagoon")
const wurmple = species("wurmple", "Wurmple")
const marill = species("marill", "Marill")
const castform = species("castform", "Castform", ["normal", "sunny"])
const allSpecies = [zigzagoon, wurmple, marill, castform]

const walk: SuggestionGroup = {
  method: "walk",
  name: "Walk",
  origin: "wild",
  entries: [
    { species: "wurmple", form: "base" },
    { species: "zigzagoon", form: "base" },
  ],
}

const gift: SuggestionGroup = {
  method: "gift",
  name: "Gift",
  origin: "gift",
  entries: [{ species: "castform", form: "sunny" }],
}

describe("speciesGroups", () => {
  test("lists the method groups in their order, then every other Species", () => {
    const groups = speciesGroups([walk, gift], allSpecies)

    expect(
      groups.map((group) => [
        group.name,
        group.choices.map((choice) => choice.name),
      ])
    ).toEqual([
      ["Walk", ["Wurmple", "Zigzagoon"]],
      ["Gift", ["Castform"]],
      ["Other species", ["Marill"]],
    ])
  })

  test("keeps a suggested Form and carries its group's origin", () => {
    const [, giftGroup] = speciesGroups([walk, gift], allSpecies)

    expect(giftGroup!.choices).toEqual([
      {
        met: { species: "castform", form: "sunny" },
        name: "Castform",
        group: { name: "Gift", origin: "gift" },
      },
    ])
  })

  test("a location with no table lists every Species as Other species", () => {
    expect(speciesGroups([], allSpecies)).toEqual([
      {
        name: "Other species",
        choices: allSpecies.map((each) => ({
          met: { species: each.id, form: each.forms[0]!.id },
          name: each.name,
          group: null,
        })),
      },
    ])
  })
})

describe("searchChoices", () => {
  test("keeps the order of the matches and the first group of a suggested Species", () => {
    const choices = searchChoices([walk, gift], [marill, zigzagoon])

    expect(choices).toEqual([
      { met: { species: "marill", form: "base" }, name: "Marill", group: null },
      {
        met: { species: "zigzagoon", form: "base" },
        name: "Zigzagoon",
        group: { name: "Walk", origin: "wild" },
      },
    ])
  })
})

describe("the Evolve Drawer's groups", () => {
  const silcoon = species("silcoon", "Silcoon")
  const cascoon = species("cascoon", "Cascoon")
  const line = [silcoon, cascoon, ...allSpecies]
  const next = [
    { species: "silcoon", form: "base" },
    { species: "cascoon", form: "base" },
  ]

  test("lists the next Species first, then every other but its own", () => {
    const groups = evolveGroups("wurmple", next, line, null)

    expect(groups.next.map((choice) => choice.name)).toEqual([
      "Silcoon",
      "Cascoon",
    ])
    expect(groups.others.map((choice) => choice.name)).toEqual([
      "Zigzagoon",
      "Marill",
      "Castform",
    ])
  })

  test("a search keeps only its matches, in their order", () => {
    const groups = evolveGroups("wurmple", next, line, [marill, cascoon])

    expect(groups.next.map((choice) => choice.name)).toEqual(["Cascoon"])
    expect(groups.others.map((choice) => choice.name)).toEqual(["Marill"])
  })

  test("a Species that does not evolve has no next Species", () => {
    expect(evolveGroups("marill", [], line, null).next).toEqual([])
  })
})
