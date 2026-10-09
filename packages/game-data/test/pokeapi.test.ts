import { parse } from "csv-parse/sync"
import { describe, expect, it } from "vitest"

import {
  importPokeApi,
  type CsvRow,
  type PokeApiTables,
} from "../importers/pokeapi.ts"

const csv = (text: string): CsvRow[] =>
  parse(text.trim(), { columns: true, trim: true })

// A tiny PokeAPI: generation 3 "emerald" and generation 1 "red"; Clefairy
// (Normal until generation 5), Magnemite (Electric/Steel from generation 2),
// Pichu (generation 2) into Pikachu, and Togekiss (generation 4).
function tables(): PokeApiTables {
  return {
    versions: csv(`
      id,version_group_id,identifier
      1,1,red
      9,6,emerald`),
    version_groups: csv(`
      id,identifier,generation_id,order
      1,red-blue,1,1
      6,emerald,3,6`),
    pokemon_species: csv(`
      id,identifier,generation_id,evolves_from_species_id
      25,pikachu,1,172
      35,clefairy,1,
      81,magnemite,1,
      172,pichu,2,
      468,togekiss,4,176
      176,togetic,2,`),
    pokemon_species_names: csv(`
      pokemon_species_id,local_language_id,name
      25,9,Pikachu
      25,1,ピカチュウ
      35,9,Clefairy
      81,9,Magnemite
      172,9,Pichu
      176,9,Togetic
      468,9,Togekiss`),
    pokemon_dex_numbers: csv(`
      species_id,pokedex_id,pokedex_number
      25,1,25
      25,2,22
      35,1,35
      81,1,81
      172,1,172
      176,1,176
      468,1,468`),
    pokemon: csv(`
      id,identifier,species_id,is_default
      25,pikachu,25,1
      10080,pikachu-rock-star,25,0
      35,clefairy,35,1
      81,magnemite,81,1
      172,pichu,172,1
      176,togetic,176,1
      468,togekiss,468,1`),
    types: csv(`
      id,identifier,generation_id
      1,normal,1
      3,flying,1
      9,steel,2
      13,electric,1
      18,fairy,6`),
    pokemon_types: csv(`
      pokemon_id,type_id,slot
      25,13,1
      35,18,1
      81,13,1
      81,9,2
      172,13,1
      176,18,1
      176,3,2
      468,18,1
      468,3,2`),
    pokemon_types_past: csv(`
      pokemon_id,generation_id,type_id,slot
      35,5,1,1
      81,1,13,1
      176,5,1,1
      176,5,3,2`),
    encounter_methods: csv(`
      id,identifier
      1,walk
      2,old-rod
      3,good-rod
      5,surf
      18,gift
      27,seaweed`),
    encounter_slots: csv(`
      id,version_group_id,encounter_method_id,slot,rarity
      1,6,1,0,20
      2,6,1,1,20
      3,6,1,2,10
      4,6,2,0,70
      5,6,3,0,60
      6,6,5,0,60
      7,6,18,0,
      8,6,27,0,60
      9,1,1,0,20`),
    locations: csv(`
      id,region_id,identifier
      1,3,hoenn-route-101
      2,3,mt-pyre
      3,3,mossdeep-city`),
    location_areas: csv(`
      id,location_id,game_index,identifier
      10,1,1,
      11,2,2,1f
      12,3,3,stevens-house`),
    encounters: csv(`
      id,version_id,location_area_id,encounter_slot_id,pokemon_id
      1,9,10,3,35
      2,9,10,1,25
      3,9,10,2,25
      4,9,10,6,81
      5,9,10,4,81
      6,9,10,5,25
      7,9,11,8,172
      8,9,12,7,35
      9,1,10,9,81`),
    encounter_condition_values: csv(`
      id,encounter_condition_id,identifier
      1,1,swarm-yes`),
    encounter_condition_value_map: csv(`
      encounter_id,encounter_condition_value_id`),
  }
}

const emerald = { generation: 3, games: ["emerald"] }

describe("importPokeApi: Species", () => {
  it("gives every Species up to the generation, in dex order", () => {
    const { species } = importPokeApi(tables(), emerald).species

    expect(species.map((s) => [s.id, s.dex, s.name])).toEqual([
      ["pikachu", 25, "Pikachu"],
      ["clefairy", 35, "Clefairy"],
      ["magnemite", 81, "Magnemite"],
      ["pichu", 172, "Pichu"],
      ["togetic", 176, "Togetic"],
    ])
  })

  it("gives each Species one base Form with its name", () => {
    const { species } = importPokeApi(tables(), emerald).species

    expect(species[0]!.forms).toEqual([
      { id: "base", name: "Pikachu", types: ["electric"] },
    ])
  })

  it("uses the past types that held in the generation", () => {
    const { species } = importPokeApi(tables(), emerald).species
    const types = Object.fromEntries(
      species.map((s) => [s.id, s.forms[0]!.types])
    )

    expect(types).toMatchObject({
      clefairy: ["normal"],
      togetic: ["normal", "flying"],
      magnemite: ["electric", "steel"],
    })
  })

  it("stops on a type newer than the generation", () => {
    const pokeApi = tables()

    pokeApi.pokemon_types_past = pokeApi.pokemon_types_past.filter(
      (row) => row.pokemon_id !== "35"
    )

    expect(() => importPokeApi(pokeApi, emerald)).toThrow(
      'Pokémon 35: the type "fairy" is newer than generation 3'
    )
  })

  it("keeps only links between Species of the generation", () => {
    const { evolutionLinks } = importPokeApi(tables(), emerald).species

    expect(evolutionLinks).toEqual([{ from: "pichu", to: "pikachu" }])
  })
})

describe("importPokeApi: wild tables", () => {
  it("merges rods into fishing and orders each group most common first", () => {
    const { areas } = importPokeApi(tables(), emerald).wild

    expect(areas["hoenn-route-101-area"]).toEqual({
      emerald: [
        { method: "walk", species: "pikachu", form: "base" },
        { method: "walk", species: "clefairy", form: "base" },
        { method: "surf", species: "magnemite", form: "base" },
        { method: "fishing", species: "magnemite", form: "base" },
        { method: "fishing", species: "pikachu", form: "base" },
      ],
    })
  })

  it("puts seaweed rows in surf and names areas as PokeAPI does", () => {
    const { areas } = importPokeApi(tables(), emerald).wild

    expect(areas["mt-pyre-1f"]).toEqual({
      emerald: [{ method: "surf", species: "pichu", form: "base" }],
    })
  })

  it("leaves out one-time rows and the areas that have only those", () => {
    const { areas } = importPokeApi(tables(), emerald).wild

    expect(Object.keys(areas)).toEqual(["hoenn-route-101-area", "mt-pyre-1f"])
  })

  it("reads only the Games of the target", () => {
    const { areas } = importPokeApi(tables(), emerald).wild

    expect(Object.keys(areas["hoenn-route-101-area"]!)).toEqual(["emerald"])
  })

  it("stops on a method it has no rule for", () => {
    const pokeApi = tables()

    pokeApi.encounter_methods.push({ id: "7", identifier: "headbutt" })
    pokeApi.encounter_slots[0]!.encounter_method_id = "7"

    expect(() => importPokeApi(pokeApi, emerald)).toThrow(
      'no rule for the method "headbutt"'
    )
  })

  it("stops on a condition on a repeatable row", () => {
    const pokeApi = tables()

    pokeApi.encounter_condition_value_map.push({
      encounter_id: "2",
      encounter_condition_value_id: "1",
    })

    expect(() => importPokeApi(pokeApi, emerald)).toThrow(
      "Encounter 2 (hoenn-route-101-area, walk): no rule for the conditions swarm-yes"
    )
  })

  it("stops on a Pokémon that is not its Species' default", () => {
    const pokeApi = tables()

    pokeApi.encounters[1]!.pokemon_id = "10080"

    expect(() => importPokeApi(pokeApi, emerald)).toThrow(
      '"pikachu-rock-star" is not a default Pokémon'
    )
  })
})

describe("importPokeApi: the target", () => {
  it("stops when a Game is not a PokeAPI version", () => {
    expect(() =>
      importPokeApi(tables(), { generation: 3, games: ["glazed"] })
    ).toThrow('PokeAPI has no version "glazed"')
  })

  it("stops when PokeAPI puts a Game in another generation", () => {
    expect(() =>
      importPokeApi(tables(), { generation: 3, games: ["red"] })
    ).toThrow('PokeAPI puts "red" in generation 1, but map.yaml says 3')
  })

  it("records the importer and its pin", () => {
    const { wild, species } = importPokeApi(tables(), emerald)

    expect([wild.importer, species.importer]).toEqual(["pokeapi", "pokeapi"])
    expect(wild.pin).toMatch(/^[0-9a-f]{40}$/)
  })
})
