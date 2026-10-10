// The game data format (decided in NUZ-44 "Game data format"):
//   1. Identifiers
//   2. The compiled Map (what the app reads)
//   3. The source files (what people and importers write)
//   4. The release lock (what the permanence check compares against)

// ---------------------------------------------------------------------------
// 1. Identifiers
// ---------------------------------------------------------------------------

/** Lowercase ASCII words joined by "-": `route-101`, `vulpix-alola`. */
export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** A Species id: a ROM hack prefixes its own new Species with `<hack>:` (`unbound:foo`). */
export const SPECIES_ID_PATTERN = /^([a-z0-9]+:)?[a-z0-9]+(-[a-z0-9]+)*$/

/** Unique in the project: `emerald`, `firered-leafgreen`. */
export type MapId = string

/** Unique in the project: `firered`, `leafgreen`. */
export type GameId = string

/** Unique in its Map: `route-1`, `starter`. */
export type PlaceId = string

/** The same in every Map: `vulpix-alola`. */
export type SpeciesId = string

/** Unique in its Species only, so a Run stores the pair. One Form: `base`. */
export type FormId = string

/** From the project-wide method list: `walk`, `surf`, `gift`. */
export type MethodId = string

/** The earliest Species of a line. Not permanent: compare in one Map only. */
export type EvolutionLineId = SpeciesId

/** Every origin of an Encounter: how the player got the Pokémon. */
export const ORIGINS = ["wild", "gift", "trade"] as const

/** The value an Encounter stores as its origin. */
export type Origin = (typeof ORIGINS)[number]

/** Every type, in the games' own order. */
export const TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const

/** One Pokémon type. */
export type Type = (typeof TYPES)[number]

// ---------------------------------------------------------------------------
// 2. The compiled Map: one JSON file per Map, `dist/<map>.json`
// ---------------------------------------------------------------------------

/** The highest level of a main-series game, for a Map that names none. */
export const DEFAULT_MAX_LEVEL = 100

/** One Map as the compile writes it and the reader loads it. */
export interface CompiledMap {
  id: MapId
  /** "FireRed and LeafGreen" */
  name: string
  /** Groups the "Choose a map" Drawer: "Kanto". */
  region: string
  /** The generation every Game of the Map belongs to. */
  generation: number
  /** Sorts Maps inside a region. */
  releaseOrder: number
  /** The highest level a Pokémon reaches in this Map's Games. */
  maxLevel: number
  /** Display order. */
  games: Game[]
  /** Only the groups this Map uses, in record Drawer order. */
  methods: Method[]
  /** Play order: exactly one Starter Place, first; Event Places last. */
  places: Place[]
  /** All Species of the generation, in National Dex order. */
  species: Species[]
  // Room for later: an optional `milestones` key. Nothing reads it in version 1.
}

/** One playable version. */
export interface Game {
  id: GameId
  /** "LeafGreen" */
  name: string
  /** "LG": shown on the Run list row before there is a starter. */
  monogram: string
}

/** A method group and the origin the record Drawer preselects for it. */
export interface Method {
  id: MethodId
  /** "Rock Smash" */
  name: string
  origin: Origin
}

/** `starter` is the one Starter Place; `event` Places count for no Progress. */
export type PlaceKind = "starter" | "standard" | "event"

/** A recorded location. Every Game of the Map has every Place. */
export interface Place {
  id: PlaceId
  kind: PlaceKind
  /** A name for every Game of the Map. Counterparts have different names. */
  names: Record<GameId, string>
  /** Method groups per Game, in the Map's `methods` order. A Game may have none. */
  tables: Partial<Record<GameId, Group[]>>
}

/** One method group of an encounter table. */
export interface Group {
  method: MethodId
  /** No duplicates, in source order (most common first). */
  entries: FormRef[]
}

/** A Species and one of its Forms. */
export interface FormRef {
  species: SpeciesId
  form: FormId
}

/** A Species as it is in one Map. */
export interface Species {
  id: SpeciesId
  /** "Alolan Raichu" */
  name: string
  /** National Dex number. A ROM hack Species uses its own number. */
  dex: number
  /** One or more; the first is the default. */
  forms: Form[]
  /** The Species this one evolves into in this Map. */
  evolvesTo: SpeciesId[]
  evolutionLine: EvolutionLineId
}

/** A Form of a Species, with its types in this Map. */
export interface Form {
  id: FormId
  /** "Sandy Cloak"; the Species name when the Species has one Form. */
  name: string
  types: [Type] | [Type, Type]
}

// ---------------------------------------------------------------------------
// 3. The source files: `sources/methods.yaml` and `sources/maps/<map>/`
//
//    map.yaml                          hand: Map facts, Games, Places in play order
//    one-time.yaml                     hand: Static, Roaming, Gift, Trade rows
//    corrections.yaml                  hand: changes to generated data
//    generated/<importer>.wild.json    written only by that importer
//    generated/<importer>.species.json written only by that importer
// ---------------------------------------------------------------------------

/** `sources/methods.yaml`: the project-wide list, in record Drawer order. */
export type MethodList = Array<Method & { oneTime: boolean }>

/** `generated/<importer>.wild.json`: repeatable wild rows by source area. */
export interface GeneratedWild {
  importer: string
  /** The source commit. */
  pin: string
  /** Source area id → Game → rows. Area ids are the importer's own. */
  areas: Record<string, Partial<Record<GameId, WildRow[]>>>
}

/** One wild row of a source area. */
export interface WildRow extends FormRef {
  method: MethodId
}

/** A Species as an importer or a correction gives it: no derived fields. */
export interface SourceSpecies {
  id: SpeciesId
  name: string
  dex: number
  forms: SourceForm[]
}

/** A Form as a source gives it. The compile checks it has one or two types. */
export interface SourceForm {
  id: FormId
  name: string
  types: Type[]
}

/** `generated/<importer>.species.json`: Species facts of the Map's generation. */
export interface GeneratedSpecies {
  importer: string
  pin: string
  species: SourceSpecies[]
  evolutionLinks: EvolutionLink[]
}

/** One Species evolves into another. */
export interface EvolutionLink {
  from: SpeciesId
  to: SpeciesId
}

/** `map.yaml` */
export interface HandMap {
  id: MapId
  name: string
  region: string
  generation: number
  releaseOrder: number
  /** Default {@link DEFAULT_MAX_LEVEL}; a ROM hack can raise it. */
  maxLevel?: number
  games: Game[]
  /** The play order. */
  places: HandPlace[]
}

/** One Place of `map.yaml`. */
export interface HandPlace {
  id: PlaceId
  /** Default `standard`. */
  kind?: PlaceKind
  /** One name for every Game, or one per Game. */
  name: string | Record<GameId, string>
  /** The source areas whose wild rows belong to this Place. */
  areas?: string[]
}

/** One row of `one-time.yaml`. Never generated. */
export interface OneTimeRow extends FormRef {
  place: PlaceId
  /** The Games that have it. */
  games: GameId[]
  method: MethodId
  /** Where it was checked in the game's source. */
  note?: string
}

/**
 * One entry of `corrections.yaml`. Each states what it expects in the
 * generated data; when a re-import changes that, the compile stops.
 */
export type Correction =
  | { op: "remove-wild"; area: string; game: GameId; row: WildRow }
  | { op: "add-wild"; area: string; game: GameId; row: WildRow }
  | { op: "ignore-area"; area: string; why: string }
  | {
      op: "set-types"
      species: SpeciesId
      form: FormId
      expect: Type[]
      types: Type[]
    }
  | { op: "add-form"; species: SpeciesId; form: SourceForm }
  | { op: "add-species"; species: SourceSpecies }
  | { op: "add-evolution-link"; evolutionLink: EvolutionLink }
  | { op: "remove-evolution-link"; evolutionLink: EvolutionLink }
  | { op: "own-evolution-line"; species: SpeciesId; why: string }

/** Every source file of one Map, parsed. */
export interface MapSources {
  methods: MethodList
  map: HandMap
  generatedWild: GeneratedWild[]
  generatedSpecies: GeneratedSpecies[]
  oneTime: OneTimeRow[]
  corrections: Correction[]
}

/**
 * `sources/sprites.yaml`: the PokeAPI file (`"10091"`, without `.png`) for a
 * Form whose sprite is neither `<dex>.png` nor `<dex>-<form>.png`, by
 * `species/form`. A Regional Variant shares its dex number, so it needs one.
 */
export type SpriteOverrides = Record<string, string>

// ---------------------------------------------------------------------------
// 4. The release lock: `released/<map>.lock.json`, committed from launch
// ---------------------------------------------------------------------------

/** Every released identifier of one Map. */
export interface ReleaseLock {
  map: MapId
  games: GameId[]
  places: PlaceId[]
  /** Species id → its dex number, which must not change. */
  species: Record<SpeciesId, number>
  /** `species/form` */
  forms: string[]
}
