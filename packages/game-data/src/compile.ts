import { err, ok, type Result } from "serializable-result"

import {
  ID_PATTERN,
  SPECIES_ID_PATTERN,
  type CompiledMap,
  type Correction,
  type EvolutionLineId,
  type EvolutionLink,
  type Form,
  type FormRef,
  type GameId,
  type Group,
  type HandMap,
  type HandPlace,
  type MapSources,
  type Method,
  type MethodId,
  type MethodList,
  type Place,
  type PlaceId,
  type SourceSpecies,
  type SpeciesId,
  type WildRow,
} from "./format.ts"

/** A compiled Map, or every problem that stops the compile. */
export type CompileResult = Result<CompiledMap, string[]>

/** A merged value and the corrections whose expectations no longer hold. */
interface Merged<T> {
  value: T
  problems: string[]
}

type RowsByGame = Map<GameId, WildRow[]>

const rowKey = (row: WildRow) => `${row.method}:${row.species}/${row.form}`
const linkKey = (link: EvolutionLink) => `${link.from}>${link.to}`
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Merges the generated and hand-written sources of one Map and validates
 * the result. Every problem names the entry it is about; the compile
 * collects them all before it stops.
 */
export function compileMap(sources: MapSources): CompileResult {
  const species = mergeSpecies(sources)
  const areas = mergeWildAreas(sources)
  const places = buildPlaces(sources, areas.value)

  const problems = [
    ...checkIds(sources),
    ...species.problems,
    ...checkSpecies(species.value.species),
    ...checkAddedLinks(sources.corrections, species.value.species),
    ...areas.problems,
    ...checkWildMethods(areas.value, sources.methods),
    ...checkClaims(sources.map, areas.value),
    ...checkPlaceNames(sources.map),
    ...checkOneTimeRows(sources),
    ...checkTableEntries(places, species.value.species),
    ...checkPlayOrder(places),
  ]

  if (problems.length > 0) return err(problems)

  const lines = evolutionLines(species.value)
  const usedMethods = usedMethodIds(places)

  return ok({
    id: sources.map.id,
    name: sources.map.name,
    region: sources.map.region,
    generation: sources.map.generation,
    releaseOrder: sources.map.releaseOrder,
    games: sources.map.games,
    methods: sources.methods
      .filter((method) => usedMethods.has(method.id))
      .map(({ id, name, origin }): Method => ({ id, name, origin })),
    places,
    species: [...species.value.species.values()]
      .sort((a, b) => a.dex - b.dex || byText(a.id, b.id))
      .map((s) => ({
        ...s,
        // checkSpecies has stopped the compile unless each Form has one or two types.
        forms: s.forms as Form[],
        evolvesTo: lines.evolvesTo.get(s.id) ?? [],
        evolutionLine: lines.lineOf.get(s.id) ?? s.id,
      })),
  })
}

function usedMethodIds(places: Place[]): Set<MethodId> {
  const used = new Set<MethodId>()

  for (const place of places) {
    for (const groups of Object.values(place.tables)) {
      for (const group of groups ?? []) used.add(group.method)
    }
  }

  return used
}

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

function checkId(label: string, id: string, pattern = ID_PATTERN): string[] {
  return pattern.test(id) ? [] : [`${label} is not a readable id`]
}

/** Each id is readable and used once. `label` names an entry in a problem. */
function checkUnique(
  entries: Array<{ id: string }>,
  label: (id: string) => string,
  pattern = ID_PATTERN
): string[] {
  const problems: string[] = []
  const seen = new Set<string>()

  for (const { id } of entries) {
    problems.push(...checkId(label(id), id, pattern))

    if (seen.has(id)) problems.push(`${label(id)} is used twice`)

    seen.add(id)
  }

  return problems
}

function checkIds(sources: MapSources): string[] {
  return [
    ...checkId(`Map id "${sources.map.id}"`, sources.map.id),
    ...checkUnique(sources.map.games, (id) => `Game id "${id}"`),
    ...checkUnique(sources.methods, (id) => `Method id "${id}"`),
    ...checkUnique(sources.map.places, (id) => `Place id "${id}"`),
  ]
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

interface SpeciesDraft {
  species: Map<SpeciesId, SourceSpecies>
  links: Map<string, EvolutionLink>
  ownLine: Set<SpeciesId>
}

/** Generated Species facts, then the corrections, in file order. */
function mergeSpecies(sources: MapSources): Merged<SpeciesDraft> {
  const problems: string[] = []
  const draft: SpeciesDraft = {
    species: new Map(),
    links: new Map(),
    ownLine: new Set(),
  }

  for (const file of sources.generatedSpecies) {
    for (const s of file.species) {
      if (draft.species.has(s.id)) {
        problems.push(`Species id "${s.id}" is used twice`)
      } else {
        draft.species.set(s.id, structuredClone(s))
      }
    }

    for (const link of file.evolutionLinks) {
      draft.links.set(linkKey(link), link)
    }
  }

  for (const correction of sources.corrections) {
    const problem = applySpeciesCorrection(correction, draft)

    if (problem) problems.push(problem)
  }

  return { value: draft, problems }
}

/**
 * Applies one correction to `draft` in place. Returns the problem when the
 * correction's expectation no longer holds; then `draft` is unchanged.
 */
function applySpeciesCorrection(
  correction: Correction,
  draft: SpeciesDraft
): string | undefined {
  const { species, links, ownLine } = draft

  switch (correction.op) {
    case "add-species": {
      const { id } = correction.species

      if (species.has(id)) {
        return `Correction add-species "${id}": the import now has it. Remove the correction.`
      }

      species.set(id, structuredClone(correction.species))

      return undefined
    }

    case "add-form": {
      const target = species.get(correction.species)
      const ref = `${correction.species}/${correction.form.id}`

      if (!target) {
        return `Correction add-form "${ref}": no Species "${correction.species}"`
      }

      if (target.forms.some((f) => f.id === correction.form.id)) {
        return `Correction add-form "${ref}": the import now has it. Remove the correction.`
      }

      target.forms.push(structuredClone(correction.form))

      return undefined
    }

    case "set-types": {
      const ref = `${correction.species}/${correction.form}`
      const form = species
        .get(correction.species)
        ?.forms.find((f) => f.id === correction.form)
      const expected = correction.expect.join("/")

      if (!form) return `Correction set-types "${ref}": no Form "${ref}"`

      if (form.types.join("/") !== expected) {
        return `Correction set-types "${ref}" expects ${expected}, but the import now says ${form.types.join("/")}. Review it.`
      }

      form.types = [...correction.types]

      return undefined
    }

    case "add-evolution-link": {
      const key = linkKey(correction.evolutionLink)

      if (links.has(key)) {
        return `Correction add-evolution-link ${key}: the import now has it. Remove the correction.`
      }

      links.set(key, correction.evolutionLink)

      return undefined
    }

    case "remove-evolution-link": {
      const key = linkKey(correction.evolutionLink)

      if (!links.has(key)) {
        return `Correction remove-evolution-link ${key}: the import no longer has it. Review it.`
      }

      links.delete(key)

      return undefined
    }

    case "own-evolution-line":
      if (!species.has(correction.species)) {
        return `Correction own-evolution-line: no Species "${correction.species}"`
      }

      ownLine.add(correction.species)

      return undefined

    default:
      return undefined
  }
}

/** Ids, Forms, and types of every Species. */
function checkSpecies(species: Map<SpeciesId, SourceSpecies>): string[] {
  const problems: string[] = []

  for (const s of species.values()) {
    problems.push(
      ...checkId(`Species id "${s.id}"`, s.id, SPECIES_ID_PATTERN),
      ...checkUnique(s.forms, (id) => `Form id "${s.id}/${id}"`)
    )

    if (s.forms.length === 0) problems.push(`Species "${s.id}" has no Form`)

    if (s.forms.length === 1 && s.forms[0]!.id !== "base") {
      problems.push(
        `Species "${s.id}" has one Form, so its Form id must be "base", not "${s.forms[0]!.id}"`
      )
    }

    for (const form of s.forms) {
      if (form.types.length < 1 || form.types.length > 2) {
        problems.push(
          `Form "${s.id}/${form.id}" needs one or two types; it has ${form.types.length}`
        )
      }
    }
  }

  return problems
}

/**
 * Generated links are filtered to the Species of the Map; a link a person
 * added must name Species that exist.
 */
function checkAddedLinks(
  corrections: Correction[],
  species: Map<SpeciesId, SourceSpecies>
): string[] {
  return corrections.flatMap((correction) => {
    if (correction.op !== "add-evolution-link") return []

    const { from, to } = correction.evolutionLink

    return [from, to]
      .filter((id) => !species.has(id))
      .map(
        (id) =>
          `Correction add-evolution-link ${from}>${to}: no Species "${id}"`
      )
  })
}

interface EvolutionLines {
  evolvesTo: Map<SpeciesId, SpeciesId[]>
  lineOf: Map<SpeciesId, EvolutionLineId>
}

/**
 * Filters the links to the Species of the Map and groups Species into
 * lines. An own-line Species keeps its links in `evolvesTo` but is cut
 * out of the line. A line's id is its earliest Species: the member that
 * no link of the line evolves into, by dex number and then id.
 */
function evolutionLines({
  species,
  links,
  ownLine,
}: SpeciesDraft): EvolutionLines {
  const mapLinks = [...links.values()].filter(
    (l) => species.has(l.from) && species.has(l.to)
  )
  const lineLinks = mapLinks.filter(
    (l) => !ownLine.has(l.from) && !ownLine.has(l.to)
  )

  const evolvesTo = new Map<SpeciesId, SpeciesId[]>()
  const neighbours = new Map<SpeciesId, SpeciesId[]>()
  const evolvedInto = new Set(lineLinks.map((l) => l.to))

  for (const { from, to } of mapLinks) {
    evolvesTo.set(from, [...(evolvesTo.get(from) ?? []), to])
  }

  for (const { from, to } of lineLinks) {
    neighbours.set(from, [...(neighbours.get(from) ?? []), to])
    neighbours.set(to, [...(neighbours.get(to) ?? []), from])
  }

  const lineOf = new Map<SpeciesId, EvolutionLineId>()

  for (const id of species.keys()) {
    if (lineOf.has(id)) continue

    const members = collectLine(id, neighbours)
    const roots = members.filter((m) => !evolvedInto.has(m))
    const earliest = (roots.length > 0 ? roots : members).sort(
      (a, b) => species.get(a)!.dex - species.get(b)!.dex || byText(a, b)
    )[0]!

    for (const member of members) lineOf.set(member, earliest)
  }

  return { evolvesTo, lineOf }
}

function collectLine(
  start: SpeciesId,
  neighbours: Map<SpeciesId, SpeciesId[]>
): SpeciesId[] {
  const members = new Set([start])
  const queue = [start]

  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    for (const next of neighbours.get(id) ?? []) {
      if (members.has(next)) continue

      members.add(next)
      queue.push(next)
    }
  }

  return [...members]
}

// ---------------------------------------------------------------------------
// Wild areas
// ---------------------------------------------------------------------------

interface WildAreas {
  rows: Map<string, RowsByGame>
  ignored: Set<string>
}

/** Generated wild areas, then the corrections, in file order. */
function mergeWildAreas(sources: MapSources): Merged<WildAreas> {
  const problems: string[] = []
  const draft: WildAreas = { rows: new Map(), ignored: new Set() }

  for (const file of sources.generatedWild) {
    for (const [area, byGame] of Object.entries(file.areas)) {
      if (draft.rows.has(area)) {
        problems.push(`Area "${area}" comes from two importers`)
      }

      draft.rows.set(
        area,
        new Map(Object.entries(byGame).map(([g, r]) => [g, [...(r ?? [])]]))
      )
    }
  }

  for (const correction of sources.corrections) {
    const problem = applyWildCorrection(correction, draft)

    if (problem) problems.push(problem)
  }

  return { value: draft, problems }
}

/**
 * Applies one correction to `draft` in place. Returns the problem when the
 * correction's expectation no longer holds; then `draft` is unchanged.
 */
function applyWildCorrection(
  correction: Correction,
  draft: WildAreas
): string | undefined {
  const { rows, ignored } = draft

  switch (correction.op) {
    case "ignore-area":
      if (!rows.has(correction.area)) {
        return `Correction ignore-area "${correction.area}": the import no longer has that area.`
      }

      ignored.add(correction.area)

      return undefined

    case "remove-wild": {
      const { area, game, row } = correction
      const gameRows = rows.get(area)?.get(game) ?? []
      const index = gameRows.findIndex((r) => rowKey(r) === rowKey(row))

      if (index < 0) {
        return `Correction remove-wild ${area} ${game} ${rowKey(row)}: the import no longer has that row. Review it.`
      }

      gameRows.splice(index, 1)

      return undefined
    }

    case "add-wild": {
      const { area, game, row } = correction
      const areaRows = rows.get(area) ?? new Map<GameId, WildRow[]>()
      const gameRows = areaRows.get(game) ?? []

      if (gameRows.some((r) => rowKey(r) === rowKey(row))) {
        return `Correction add-wild ${area} ${game} ${rowKey(row)}: the import now has that row. Remove the correction.`
      }

      areaRows.set(game, [...gameRows, row])
      rows.set(area, areaRows)

      return undefined
    }

    default:
      return undefined
  }
}

/** Generated rows may use only known, repeatable methods. */
function checkWildMethods(areas: WildAreas, methods: MethodList): string[] {
  const byId = new Map(methods.map((m) => [m.id, m]))
  const problems: string[] = []

  for (const [area, byGame] of areas.rows) {
    for (const row of [...byGame.values()].flat()) {
      const method = byId.get(row.method)

      if (!method) {
        problems.push(`Area "${area}" uses unknown method "${row.method}"`)
      } else if (method.oneTime) {
        problems.push(
          `Area "${area}" has a ${method.name} row (${row.species}). One-time rows are hand-written only.`
        )
      }
    }
  }

  return problems
}

/** Every area belongs to exactly one Place or is ignored, and only for Games of the Map. */
function checkClaims(map: HandMap, areas: WildAreas): string[] {
  const gameIds = new Set(map.games.map((g) => g.id))
  const claimedBy = new Map<string, PlaceId>()
  const problems: string[] = []

  for (const place of map.places) {
    for (const area of place.areas ?? []) {
      const owner = claimedBy.get(area)
      const areaRows = areas.rows.get(area)

      claimedBy.set(area, place.id)

      if (owner) {
        problems.push(
          `Area "${area}" is claimed by "${owner}" and "${place.id}"`
        )
      }

      if (areas.ignored.has(area)) {
        problems.push(
          `Area "${area}" is claimed by "${place.id}" and also ignored`
        )
      }

      if (!areaRows) {
        problems.push(
          `Place "${place.id}" claims area "${area}", which the import does not have`
        )
        continue
      }

      for (const game of areaRows.keys()) {
        if (!gameIds.has(game)) {
          problems.push(`Area "${area}" has rows for unknown Game "${game}"`)
        }
      }
    }
  }

  for (const area of areas.rows.keys()) {
    if (!claimedBy.has(area) && !areas.ignored.has(area)) {
      problems.push(
        `Area "${area}" from the import belongs to no Place. Claim it in map.yaml or ignore it in corrections.yaml.`
      )
    }
  }

  return problems
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

/**
 * The Places in play order, with a name per Game and their tables. Entries
 * that the checks refuse are left out or left empty, so this never fails.
 */
function buildPlaces(sources: MapSources, areas: WildAreas): Place[] {
  const gameIds = sources.map.games.map((g) => g.id)
  const oneTimeRows = oneTimeRowsByPlace(sources)

  return sources.map.places.map((hand) => {
    const rows = new Map<GameId, WildRow[]>()
    const add = (game: GameId, added: WildRow[]) =>
      rows.set(game, [...(rows.get(game) ?? []), ...added])

    for (const area of hand.areas ?? []) {
      for (const [game, areaRows] of areas.rows.get(area) ?? []) {
        if (gameIds.includes(game)) add(game, areaRows)
      }
    }

    for (const [game, added] of oneTimeRows.get(hand.id) ?? []) {
      if (gameIds.includes(game)) add(game, added)
    }

    const tables: Place["tables"] = {}

    for (const [game, gameRows] of rows) {
      tables[game] = groupRows(gameRows, sources.methods)
    }

    return {
      id: hand.id,
      kind: hand.kind ?? "standard",
      names: Object.fromEntries(
        gameIds.map((game) => [game, nameIn(hand, game) ?? ""])
      ),
      tables,
    }
  })
}

/** The name of a Place in a Game, from its own entry only. */
function nameIn(place: HandPlace, game: GameId): string | undefined {
  if (typeof place.name === "string") return place.name

  return Object.hasOwn(place.name, game) ? place.name[game] : undefined
}

function oneTimeRowsByPlace(sources: MapSources): Map<PlaceId, RowsByGame> {
  const byPlace = new Map<PlaceId, RowsByGame>()

  for (const row of sources.oneTime) {
    const rows = byPlace.get(row.place) ?? new Map<GameId, WildRow[]>()
    const wildRow = { method: row.method, species: row.species, form: row.form }

    for (const game of row.games) {
      rows.set(game, [...(rows.get(game) ?? []), wildRow])
    }

    byPlace.set(row.place, rows)
  }

  return byPlace
}

/** Method groups in the project's method order, entries deduplicated in source order. */
function groupRows(rows: WildRow[], methods: Array<{ id: MethodId }>): Group[] {
  return methods.flatMap(({ id }) => {
    const seen = new Set<string>()
    const entries: FormRef[] = []

    for (const row of rows) {
      const key = `${row.species}/${row.form}`

      if (row.method !== id || seen.has(key)) continue

      seen.add(key)
      entries.push({ species: row.species, form: row.form })
    }

    return entries.length > 0 ? [{ method: id, entries }] : []
  })
}

/** A name for every Game, and only for Games of the Map. */
function checkPlaceNames(map: HandMap): string[] {
  const gameIds = map.games.map((g) => g.id)

  return map.places.flatMap((place) => {
    if (typeof place.name === "string") return []

    const unknown = Object.keys(place.name)
      .filter((game) => !gameIds.includes(game))
      .map((game) => `Place "${place.id}" names unknown Game "${game}"`)
    const missing = gameIds
      .filter((game) => !nameIn(place, game))
      .map(
        (game) =>
          `Place "${place.id}" has no name for ${game}. Every Place is in every Game of its Map.`
      )

    return [...unknown, ...missing]
  })
}

/** Each one-time row names a Place, Games of the Map, and a one-time method. */
function checkOneTimeRows(sources: MapSources): string[] {
  const methods = new Map(sources.methods.map((m) => [m.id, m]))
  const placeIds = new Set(sources.map.places.map((p) => p.id))
  const gameIds = new Set(sources.map.games.map((g) => g.id))

  return sources.oneTime.flatMap((row) => {
    const label = `One-time row ${row.species}/${row.form} at "${row.place}"`
    const method = methods.get(row.method)

    if (!placeIds.has(row.place)) return [`${label}: no Place "${row.place}"`]
    if (!method) return [`${label}: unknown method "${row.method}"`]

    return [
      ...(method.oneTime
        ? []
        : [`${label}: ${method.name} is not a one-time method`]),
      ...row.games
        .filter((game) => !gameIds.has(game))
        .map((game) => `${label}: unknown Game "${game}"`),
    ]
  })
}

/** Every table entry names a Species and Form of the Map. */
function checkTableEntries(
  places: Place[],
  species: Map<SpeciesId, SourceSpecies>
): string[] {
  const hasForm = (ref: FormRef) =>
    species.get(ref.species)?.forms.some((f) => f.id === ref.form) ?? false

  return places.flatMap((place) =>
    Object.entries(place.tables).flatMap(([game, groups]) =>
      (groups ?? [])
        .flatMap((group) => group.entries)
        .filter((entry) => !hasForm(entry))
        .map(
          (entry) =>
            `Place "${place.id}" (${game}) names unknown Species or Form "${entry.species}/${entry.form}"`
        )
    )
  )
}

function checkPlayOrder(places: Place[]): string[] {
  const problems: string[] = []
  const starters = places.filter((p) => p.kind === "starter")

  if (starters.length !== 1) {
    problems.push(
      `The Map needs exactly one Starter Place; it has ${starters.length}`
    )
  } else if (places[0] !== starters[0]) {
    problems.push(
      `The Starter Place "${starters[0]!.id}" must be first in the play order`
    )
  }

  const firstEvent = places.findIndex((p) => p.kind === "event")
  const lateStandard =
    firstEvent < 0
      ? undefined
      : places.slice(firstEvent).find((p) => p.kind !== "event")

  if (lateStandard) {
    problems.push(
      `Place "${lateStandard.id}" comes after an Event Place. Event Places must be last in the play order.`
    )
  }

  return problems
}
