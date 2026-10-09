// The PokeAPI importer: PokeAPI's CSV tables at one pinned commit in, the
// generated source files of one Map out. Pure: `scripts/import-pokeapi.ts`
// fetches the tables and writes the files.

import {
  TYPES,
  type EvolutionLink,
  type GameId,
  type GeneratedSpecies,
  type GeneratedWild,
  type MethodId,
  type SourceSpecies,
  type Type,
  type WildRow,
} from "../src/format.ts"

/** The PokeAPI commit every import reads. */
export const POKEAPI_PIN = "2fe95532d27a9bf340575253aff50868319d8182"

/** The CSV files of `data/v2/csv/` the import reads, without `.csv`. */
export const POKEAPI_FILES = [
  "encounters",
  "encounter_slots",
  "encounter_methods",
  "encounter_condition_value_map",
  "encounter_condition_values",
  "versions",
  "version_groups",
  "location_areas",
  "locations",
  "pokemon",
  "pokemon_species",
  "pokemon_species_names",
  "pokemon_dex_numbers",
  "pokemon_types",
  "pokemon_types_past",
  "types",
] as const

/** One CSV row, by column name. */
export type CsvRow = Record<string, string>

/** Every file of `POKEAPI_FILES`, parsed into rows. */
export type PokeApiTables = Record<(typeof POKEAPI_FILES)[number], CsvRow[]>

/** The Map facts the import needs, from `map.yaml`. */
export interface ImportTarget {
  generation: number
  /** Each Game id must be a PokeAPI version identifier (`emerald`). */
  games: GameId[]
}

/** The two generated source files of one Map. */
export interface PokeApiImport {
  wild: GeneratedWild
  species: GeneratedSpecies
}

const IMPORTER = "pokeapi"

/** PokeAPI's repeatable methods, by the method group they belong to. */
const REPEATABLE: Record<string, MethodId> = {
  walk: "walk",
  surf: "surf",
  // Diving in seaweed uses the water table of the Underwater map.
  seaweed: "surf",
  "old-rod": "fishing",
  "good-rod": "fishing",
  "super-rod": "fishing",
  "feebas-tile-fishing": "fishing",
  "rock-smash": "rock-smash",
}

/** Methods whose rows the import leaves out, with the reason. */
const LEFT_OUT: Record<string, string> = {
  gift: "one-time",
  "gift-egg": "one-time",
  static: "one-time",
  "npc-trade": "one-time",
  "roaming-grass": "one-time",
  "roaming-water": "one-time",
  "devon-scope": "one-time",
  "wailmer-pail": "one-time",
  "colosseum-bonus-disc-jpn": "outside the cartridge",
  "colosseum-bonus-disc-us": "outside the cartridge",
}

const METHOD_ORDER = [...new Set(Object.values(REPEATABLE))]
const ENGLISH = "9"
const NATIONAL_DEX = "1"

/**
 * The generated wild tables and Species facts of one Map. Throws, naming
 * the row, on PokeAPI data it has no rule for: an unknown method, a
 * condition on a repeatable row, a non-default Pokémon in a table, a type
 * newer than the generation, or a Game whose generation differs.
 *
 * `tables` holds every file of `POKEAPI_FILES` at `POKEAPI_PIN`, each
 * parsed with its header row as the column names.
 *
 * @example
 * const tables = Object.fromEntries(
 *   POKEAPI_FILES.map((file) => [file, parse(csvText[file], { columns: true })])
 * ) as PokeApiTables
 * const { wild, species } = importPokeApi(tables, { generation: 3, games: ["emerald"] })
 */
export function importPokeApi(
  tables: PokeApiTables,
  target: ImportTarget
): PokeApiImport {
  const versions = versionIdsOf(tables, target)

  return {
    wild: {
      importer: IMPORTER,
      pin: POKEAPI_PIN,
      areas: importAreas(tables, versions),
    },
    species: {
      importer: IMPORTER,
      pin: POKEAPI_PIN,
      ...importSpecies(tables, target.generation),
    },
  }
}

const byId = (rows: CsvRow[]) => new Map(rows.map((row) => [row.id!, row]))

/** PokeAPI version id → Game id, for the Games of the target. */
function versionIdsOf(
  tables: PokeApiTables,
  target: ImportTarget
): Map<string, GameId> {
  const groups = byId(tables.version_groups)

  return new Map(
    target.games.map((game) => {
      const version = tables.versions.find((v) => v.identifier === game)

      if (!version) throw new Error(`PokeAPI has no version "${game}"`)

      const generation = Number(
        groups.get(version.version_group_id!)?.generation_id
      )

      if (generation !== target.generation) {
        throw new Error(
          `PokeAPI puts "${game}" in generation ${generation}, but map.yaml says ${target.generation}`
        )
      }

      return [version.id!, game]
    })
  )
}

// ---------------------------------------------------------------------------
// Wild tables
// ---------------------------------------------------------------------------

/** One repeatable row and how common it is in its area and Game. */
interface CountedRow {
  row: WildRow
  rarity: number
  firstSlot: number
}

type AreaRows = GeneratedWild["areas"]

/** Repeatable rows by area name and Game; areas with none are left out. */
function importAreas(
  tables: PokeApiTables,
  versions: Map<string, GameId>
): AreaRows {
  const slots = byId(tables.encounter_slots)
  const methods = byId(tables.encounter_methods)
  const pokemon = byId(tables.pokemon)
  const species = byId(tables.pokemon_species)
  const areaNames = areaNamesOf(tables)
  const conditions = conditionsOf(tables)
  const counted = new Map<string, Map<GameId, Map<string, CountedRow>>>()

  for (const encounter of tables.encounters) {
    const game = versions.get(encounter.version_id!)

    if (!game) continue

    const slot = slots.get(encounter.encounter_slot_id!)!
    const pokeApiMethod = methods.get(slot.encounter_method_id!)!.identifier!
    const area = areaNames.get(encounter.location_area_id!)!
    const label = `Encounter ${encounter.id} (${area}, ${pokeApiMethod})`

    if (Object.hasOwn(LEFT_OUT, pokeApiMethod)) continue

    if (!Object.hasOwn(REPEATABLE, pokeApiMethod)) {
      throw new Error(`${label}: no rule for the method "${pokeApiMethod}"`)
    }

    const encounterConditions = conditions.get(encounter.id!)

    if (encounterConditions) {
      throw new Error(
        `${label}: no rule for the conditions ${encounterConditions.join(", ")}`
      )
    }

    const mon = pokemon.get(encounter.pokemon_id!)!

    if (mon.is_default !== "1") {
      throw new Error(`${label}: "${mon.identifier}" is not a default Pokémon`)
    }

    const row: WildRow = {
      method: REPEATABLE[pokeApiMethod]!,
      species: species.get(mon.species_id!)!.identifier!,
      form: "base",
    }
    const byGame = counted.get(area) ?? new Map()
    const rows = byGame.get(game) ?? new Map<string, CountedRow>()
    const key = `${row.method}:${row.species}`
    const previous = rows.get(key)

    rows.set(key, {
      row,
      rarity: (previous?.rarity ?? 0) + Number(slot.rarity),
      firstSlot: Math.min(previous?.firstSlot ?? Infinity, Number(slot.id)),
    })
    byGame.set(game, rows)
    counted.set(area, byGame)
  }

  const areas: AreaRows = {}

  for (const area of [...counted.keys()].sort()) {
    areas[area] = Object.fromEntries(
      [...counted.get(area)!].map(([game, rows]) => [
        game,
        mostCommonFirst([...rows.values()]),
      ])
    )
  }

  return areas
}

/** By method group, then the most common first, then the earliest slot. */
function mostCommonFirst(rows: CountedRow[]): WildRow[] {
  const methodIndex = (row: CountedRow) => METHOD_ORDER.indexOf(row.row.method)

  return rows
    .sort(
      (a, b) =>
        methodIndex(a) - methodIndex(b) ||
        b.rarity - a.rarity ||
        a.firstSlot - b.firstSlot
    )
    .map((counted) => counted.row)
}

/** Location area id → PokeAPI's area name: `hoenn-route-101-area`, `mt-pyre-1f`. */
function areaNamesOf(tables: PokeApiTables): Map<string, string> {
  const locations = byId(tables.locations)

  return new Map(
    tables.location_areas.map((area) => {
      const location = locations.get(area.location_id!)!.identifier

      return [area.id!, `${location}-${area.identifier || "area"}`]
    })
  )
}

/** Encounter id → the identifiers of its condition values. */
function conditionsOf(tables: PokeApiTables): Map<string, string[]> {
  const values = byId(tables.encounter_condition_values)
  const conditions = new Map<string, string[]>()

  for (const entry of tables.encounter_condition_value_map) {
    const value = values.get(entry.encounter_condition_value_id!)!.identifier!

    conditions.set(entry.encounter_id!, [
      ...(conditions.get(entry.encounter_id!) ?? []),
      value,
    ])
  }

  return conditions
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

/** Every Species up to the generation, in dex order, and the links between them. */
function importSpecies(
  tables: PokeApiTables,
  generation: number
): Pick<GeneratedSpecies, "species" | "evolutionLinks"> {
  const inGeneration = tables.pokemon_species.filter(
    (s) => Number(s.generation_id) <= generation
  )
  const identifiers = new Map(inGeneration.map((s) => [s.id!, s.identifier!]))
  const dex = nationalDexOf(tables)
  const names = englishNamesOf(tables)
  const typesOf = typesIn(tables, generation)
  const defaults = new Map(
    tables.pokemon
      .filter((p) => p.is_default === "1")
      .map((p) => [p.species_id!, p.id!])
  )

  const species = inGeneration
    .map((s): SourceSpecies => {
      const name = names.get(s.id!)!

      return {
        id: s.identifier!,
        name,
        dex: dex.get(s.id!)!,
        forms: [{ id: "base", name, types: typesOf(defaults.get(s.id!)!) }],
      }
    })
    .sort((a, b) => a.dex - b.dex)

  const evolutionLinks = inGeneration
    .filter((s) => identifiers.has(s.evolves_from_species_id!))
    .map((s): EvolutionLink => ({
      from: identifiers.get(s.evolves_from_species_id!)!,
      to: s.identifier!,
    }))
    .sort(
      (a, b) =>
        dexOf(species, a.from) - dexOf(species, b.from) ||
        dexOf(species, a.to) - dexOf(species, b.to)
    )

  return { species, evolutionLinks }
}

const dexOf = (species: SourceSpecies[], id: string) =>
  species.find((s) => s.id === id)!.dex

function nationalDexOf(tables: PokeApiTables): Map<string, number> {
  return new Map(
    tables.pokemon_dex_numbers
      .filter((row) => row.pokedex_id === NATIONAL_DEX)
      .map((row) => [row.species_id!, Number(row.pokedex_number)])
  )
}

function englishNamesOf(tables: PokeApiTables): Map<string, string> {
  return new Map(
    tables.pokemon_species_names
      .filter((row) => row.local_language_id === ENGLISH)
      .map((row) => [row.pokemon_species_id!, row.name!])
  )
}

/**
 * A Pokémon's types in the generation. A row of `pokemon_types_past` gives
 * the types up to its generation, so the earliest one at or after the
 * target generation wins; with none, the current types hold.
 */
function typesIn(
  tables: PokeApiTables,
  generation: number
): (pokemonId: string) => Type[] {
  const types = byId(tables.types)

  return (pokemonId) => {
    const past = tables.pokemon_types_past.filter(
      (row) =>
        row.pokemon_id === pokemonId && Number(row.generation_id) >= generation
    )
    const until = Math.min(...past.map((row) => Number(row.generation_id)))
    const rows =
      past.length > 0
        ? past.filter((row) => Number(row.generation_id) === until)
        : tables.pokemon_types.filter((row) => row.pokemon_id === pokemonId)

    return rows
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((row) => typeOf(types.get(row.type_id!)!, generation, pokemonId))
  }
}

function typeOf(type: CsvRow, generation: number, pokemonId: string): Type {
  const identifier = type.identifier as Type

  if (!TYPES.includes(identifier)) {
    throw new Error(`Pokémon ${pokemonId}: unknown type "${identifier}"`)
  }

  if (Number(type.generation_id) > generation) {
    throw new Error(
      `Pokémon ${pokemonId}: the type "${identifier}" is newer than generation ${generation}`
    )
  }

  return identifier
}
