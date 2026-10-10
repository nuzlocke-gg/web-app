import { describe, expect, test } from "vitest"

import { encounterState, evolutionState, pokemonState } from "@/test/run-state"

import { historyOf } from "./history"

const treecko = { species: "treecko", form: "base" }
const grovyle = { species: "grovyle", form: "base" }
const sceptile = { species: "sceptile", form: "base" }
const met = encounterState({ met: treecko, enteredAt: Date.UTC(2026, 9, 1) })

describe("History", () => {
  test("has the Encounter line and each evolution line, by time of entry", () => {
    const later = evolutionState(grovyle, sceptile, {
      enteredAt: Date.UTC(2026, 9, 4),
    })
    const earlier = evolutionState(treecko, grovyle, {
      enteredAt: Date.UTC(2026, 9, 2),
    })
    const pokemon = pokemonState(met, { evolutions: [earlier, later] })

    expect(
      historyOf(met, pokemon).map((line) => [line.kind, line.enteredAt])
    ).toEqual([
      ["encounter", Date.UTC(2026, 9, 1)],
      ["evolution", Date.UTC(2026, 9, 2)],
      ["evolution", Date.UTC(2026, 9, 4)],
    ])
  })

  test("lines entered at one time are ordered by id", () => {
    const at = Date.UTC(2026, 9, 2)
    const a = evolutionState(treecko, grovyle, {
      id: "0199c4a0-0000-7000-8000-00000000000a",
      enteredAt: at,
    })
    const b = evolutionState(grovyle, sceptile, {
      id: "0199c4a0-0000-7000-8000-00000000000b",
      enteredAt: at,
    })
    const pokemon = pokemonState(met, { evolutions: [b, a] })

    expect(historyOf(met, pokemon).map((line) => line.id)).toEqual([
      met.id,
      a.id,
      b.id,
    ])
  })

  test("a death line shows while the Pokémon is dead", () => {
    const diedAt = Date.UTC(2026, 9, 3)
    const living = pokemonState(met)
    const dead = { ...living, diedAt, deathLevel: 14, deathCause: "Nosepass" }

    expect(historyOf(met, living).map((line) => line.kind)).toEqual([
      "encounter",
    ])
    expect(historyOf(met, dead).at(-1)).toEqual({
      kind: "death",
      id: dead.id,
      enteredAt: diedAt,
      level: 14,
      cause: "Nosepass",
    })
  })

  test("a correction to the Encounter edits its line", () => {
    const pokemon = pokemonState(met)
    const corrected = { ...met, met: { species: "mudkip", form: "base" } }

    expect(historyOf(corrected, pokemon)[0]).toMatchObject({
      kind: "encounter",
      encounter: { met: { species: "mudkip" } },
    })
  })
})
