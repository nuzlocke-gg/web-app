import { loadMap, type LoadedMap } from "@workspace/game-data"
import { beforeAll, describe, expect, test } from "vitest"

import { historyOf } from "@/lib/runs/history"
import type { EncounterState, PokemonState } from "@/lib/runs/state"
import { encounterState, evolutionState, pokemonState } from "@/test/run-state"

import { historyDate, historyText } from "./history-text"

const nincada = { species: "nincada", form: "base" }
const ninjask = { species: "ninjask", form: "base" }

let map: LoadedMap

beforeAll(async () => {
  map = (await loadMap("emerald"))!
})

/** The text of each History line of the Pokémon. */
function texts(encounter: EncounterState, pokemon: PokemonState): string[] {
  return historyOf(encounter, pokemon).map((line) =>
    historyText(map, "emerald", pokemon, line)
  )
}

describe("History text", () => {
  const route116 = encounterState({ placeId: "route-116", met: nincada })

  test("a wild Encounter names the Species met only once it evolved", () => {
    const line = evolutionState(nincada, ninjask)

    expect(texts(route116, pokemonState(route116))).toEqual([
      "Met at Route 116",
    ])
    expect(
      texts(
        route116,
        pokemonState(route116, { species: ninjask, evolutions: [line] })
      )
    ).toEqual(["Met as Nincada at Route 116", "Evolved into Ninjask"])
  })

  test("a gift is received, and a trade always names the Species", () => {
    const gift = encounterState({
      placeId: "starter",
      origin: "gift",
      met: { species: "treecko", form: "base" },
    })
    const trade = { ...route116, origin: "trade" as const }

    expect(texts(gift, pokemonState(gift))).toEqual(["Received at Starter"])
    expect(texts(trade, pokemonState(trade))).toEqual([
      "Traded for Nincada at Route 116",
    ])
  })

  test("a death has its level and cause when the player gave them", () => {
    const died = { diedAt: Date.UTC(2026, 9, 3) }
    const withBoth = pokemonState(route116, {
      ...died,
      deathLevel: 14,
      deathCause: "Roxanne's Nosepass",
    })

    expect(texts(route116, withBoth).at(-1)).toBe(
      "Died at level 14 to Roxanne's Nosepass"
    )
    expect(texts(route116, pokemonState(route116, died)).at(-1)).toBe("Died")
  })
})

describe("History date", () => {
  test("has the year only when it is not this year", () => {
    const date = new Date(2026, 9, 2).getTime()

    expect(historyDate(date, 2026)).not.toMatch(/2026/)
    expect(historyDate(date, 2027)).toMatch(/2026/)
  })
})
