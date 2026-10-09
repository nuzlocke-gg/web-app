import {
  TYPES,
  type CompiledMap,
  type EvolutionLineId,
  type Form,
  type FormId,
  type FormRef,
  type Game,
  type GameId,
  type MapId,
  type Method,
  type MethodId,
  type Origin,
  type Place,
  type PlaceId,
  type PlaceKind,
  type Species,
  type SpeciesId,
  type Type,
} from "./format.ts"

/** One Map of the "Choose a map" Drawer. */
export type MapSummary = Pick<
  CompiledMap,
  "id" | "name" | "region" | "generation" | "releaseOrder" | "games"
>

/**
 * The catalog entry of a Map. It drops the Places, Species, and method
 * groups, so a catalog of every Map stays small enough to ship with the
 * page while each full Map loads on demand.
 */
export function toSummary(map: CompiledMap): MapSummary {
  const { id, name, region, generation, releaseOrder, games } = map

  return { id, name, region, generation, releaseOrder, games }
}

/** The Maps the reader can load: a small catalog and one loader per Map. */
export interface MapRegistry {
  /** Every Map the registry can load. */
  catalog: MapSummary[]
  /** Loads one compiled Map, by Map id. */
  load: Record<MapId, () => Promise<CompiledMap>>
}

/**
 * Where a Form's sprite is, under the sprite directory. A ROM hack's `:`
 * becomes `--`, which no other identifier has, because `:` is not valid in
 * a Windows file name.
 */
export function spritePath(ref: FormRef): string {
  return `${ref.species.replace(":", "--")}/${ref.form}.png`
}

/** Where the sprite for an unknown Pokémon is, under the sprite directory. */
export const UNKNOWN_SPRITE_PATH = "unknown.png"

/** The URL of the sprite for an unknown Pokémon, or for a sprite that cannot load. */
export const unknownSpriteUrl = `/sprites/${UNKNOWN_SPRITE_PATH}`

/**
 * The URL of a Form's sprite, `/sprites/<species>/<form>.png`. A Form of the
 * Map always has one; an unknown Species or Form gives `undefined`.
 */
export function spriteUrl(
  map: LoadedMap,
  species: SpeciesId,
  form: FormId
): string | undefined {
  if (!getForm(map, species, form)) return undefined

  return `/sprites/${spritePath({ species, form })}`
}

/**
 * A loaded Map with lookup indexes. Every reader function takes it first.
 * It is shared by every caller: treat it, and everything a reader function
 * returns from it, as read-only.
 */
export interface LoadedMap {
  /** The compiled Map as the build wrote it. */
  data: CompiledMap
  /** Games by id. */
  games: Map<GameId, Game>
  /** Places by id. */
  places: Map<PlaceId, Place>
  /** Species by id. */
  species: Map<SpeciesId, Species>
  /** The method groups this Map uses, by id. */
  methods: Map<MethodId, Method>
}

/**
 * The Maps of a registry.
 *
 * @example
 * const map = await loadMap(run.mapId)
 * const rows = map ? placesOf(map, journey.gameId) : []
 */
export interface Reader {
  /** Every Map, in release order. */
  listMaps(): MapSummary[]
  /**
   * One Map, loaded once and then cached. An unknown Map gives `undefined`.
   * A failed load rejects and is not cached, so a later call tries again.
   */
  loadMap(id: MapId): Promise<LoadedMap | undefined>
}

/** Binds the reader to a registry. The app uses the one bound to the compiled Maps. */
export function createReader(registry: MapRegistry): Reader {
  const cache = new Map<MapId, Promise<LoadedMap | undefined>>()

  async function load(id: MapId): Promise<LoadedMap | undefined> {
    if (!Object.hasOwn(registry.load, id)) return undefined

    return indexMap(await registry.load[id]!())
  }

  return {
    listMaps() {
      return [...registry.catalog].sort(
        (a, b) => a.releaseOrder - b.releaseOrder
      )
    },

    loadMap(id) {
      const cached = cache.get(id)

      if (cached) return cached

      const loading = load(id)

      cache.set(id, loading)
      loading.catch(() => cache.delete(id))

      return loading
    },
  }
}

function indexMap(data: CompiledMap): LoadedMap {
  return {
    data,
    games: new Map(data.games.map((g) => [g.id, g])),
    places: new Map(data.places.map((p) => [p.id, p])),
    species: new Map(data.species.map((s) => [s.id, s])),
    methods: new Map(data.methods.map((m) => [m.id, m])),
  }
}

/** A Game of the Map: its name and monogram. */
export function getGame(map: LoadedMap, game: GameId): Game | undefined {
  return map.games.get(game)
}

/** One row of the Encounters tab. */
export interface PlaceRow {
  id: PlaceId
  kind: PlaceKind
  /** The name in the Game asked for. */
  name: string
}

/** The Places of a Game in play order: the Starter Place first, Event Places last. */
export function placesOf(map: LoadedMap, game: GameId): PlaceRow[] {
  if (!map.games.has(game)) return []

  return map.data.places.map((p) => ({
    id: p.id,
    kind: p.kind,
    name: p.names[game]!,
  }))
}

/** The name of a Place in a Game. */
export function placeName(
  map: LoadedMap,
  place: PlaceId,
  game: GameId
): string | undefined {
  if (!map.games.has(game)) return undefined

  return map.places.get(place)?.names[game]
}

/** One method group of the record Drawer, with the origin it preselects. */
export interface SuggestionGroup {
  method: MethodId
  /** The group's label: "Rock Smash". */
  name: string
  /** The origin the record Drawer preselects for an Encounter from this group. */
  origin: Origin
  /** The Species and Forms, most common first. */
  entries: FormRef[]
}

/** The encounter table of a Place in a Game, in method group order. Empty when there is none. */
export function suggestions(
  map: LoadedMap,
  place: PlaceId,
  game: GameId
): SuggestionGroup[] {
  if (!map.games.has(game)) return []

  const groups = map.places.get(place)?.tables[game] ?? []

  return groups.map((group) => {
    const method = map.methods.get(group.method)!

    return {
      method: method.id,
      name: method.name,
      origin: method.origin,
      entries: group.entries,
    }
  })
}

/** A Species of the Map. */
export function getSpecies(
  map: LoadedMap,
  species: SpeciesId
): Species | undefined {
  return map.species.get(species)
}

/** A Form of a Species. */
export function getForm(
  map: LoadedMap,
  species: SpeciesId,
  form: FormId
): Form | undefined {
  return map.species.get(species)?.forms.find((f) => f.id === form)
}

/** Whether the Species has more than one Form, so a Form control shows. */
export function hasFormChoice(map: LoadedMap, species: SpeciesId): boolean {
  return (map.species.get(species)?.forms.length ?? 0) > 1
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

/**
 * Species whose name contains the query, prefix matches first, then in dex
 * order. Case, accents, and punctuation are ignored ("mr mime", "flabebe").
 * A query of digits matches the start of the dex number. An empty query
 * gives every Species.
 */
export function searchSpecies(map: LoadedMap, query: string): Species[] {
  const folded = fold(query)
  const all = map.data.species

  if (!folded) return all

  if (/^\d+$/.test(folded)) {
    const digits = folded.replace(/^0+/, "") || "0"

    return all.filter((s) => String(s.dex).startsWith(digits))
  }

  const hits = all.filter((s) => fold(s.name).includes(folded))
  const prefix = hits.filter((s) => fold(s.name).startsWith(folded))

  return [...prefix, ...hits.filter((s) => !prefix.includes(s))]
}

/**
 * What a Species evolves into in this Map. With a Form, each target keeps
 * that Form id when it has it, else takes its first Form. Empty when the
 * Species does not evolve, or when the Species or the Form is unknown.
 */
export function nextInLine(
  map: LoadedMap,
  species: SpeciesId,
  form?: FormId
): FormRef[] {
  const source = map.species.get(species)

  if (!source) return []
  if (form !== undefined && !source.forms.some((f) => f.id === form)) return []

  return source.evolvesTo.flatMap((to) => {
    const target = map.species.get(to)

    if (!target) return []

    const kept = target.forms.find((f) => f.id === form) ?? target.forms[0]!

    return [{ species: to, form: kept.id }]
  })
}

/** The Evolution Line of a Species. Compare line ids from one Map only. */
export function evolutionLineOf(
  map: LoadedMap,
  species: SpeciesId
): EvolutionLineId | undefined {
  return map.species.get(species)?.evolutionLine
}

/** The first type of a Form in this Map. */
export function primaryType(
  map: LoadedMap,
  species: SpeciesId,
  form: FormId
): Type | undefined {
  return getForm(map, species, form)?.types[0]
}

/** The types of a Form in this Map. */
export function formTypes(
  map: LoadedMap,
  species: SpeciesId,
  form: FormId
): readonly Type[] | undefined {
  return getForm(map, species, form)?.types
}

/** The types that some Form of the Map has, in the games' order. */
export function typesOf(map: LoadedMap): Type[] {
  const present = new Set(
    map.data.species.flatMap((s) => s.forms.flatMap((f) => f.types))
  )

  return TYPES.filter((t) => present.has(t))
}

/** The National Dex number of a Species. */
export function dexNumber(
  map: LoadedMap,
  species: SpeciesId
): number | undefined {
  return map.species.get(species)?.dex
}

/**
 * The Progress denominator: every Place of the Map except Event Places.
 * The same for a solo Run and a Soul Link.
 */
export function progressTotal(map: LoadedMap): number {
  return map.data.places.filter((p) => p.kind !== "event").length
}
