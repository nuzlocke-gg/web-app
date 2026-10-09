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
  type MapSources,
  type Method,
  type MethodId,
  type Place,
  type PlaceId,
  type SourceSpecies,
  type Species,
  type SpeciesId,
  type WildRow,
} from "./format.ts"

/** A compiled Map, or every problem that stops the compile. */
export type CompileResult = Result<CompiledMap, string[]>

type Report = (problem: string) => void

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
  const problems: string[] = []
  const report: Report = (problem) => problems.push(problem)

  checkId(`Map id "${sources.map.id}"`, sources.map.id, report)
  checkUnique(sources.map.games, (id) => `Game id "${id}"`, report)
  checkUnique(sources.methods, (id) => `Method id "${id}"`, report)

  const merged = mergeSpecies(sources, report)
  const species = validateSpecies(merged.species, report)
  const lines = evolutionLines(species, merged.links, merged.ownLine)
  const areas = mergeWildAreas(sources, report)
  const places = buildPlaces(sources, areas, species, report)

  checkPlayOrder(places, report)

  if (problems.length > 0) return err(problems)

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
    species: [...species.values()]
      .sort((a, b) => a.dex - b.dex || byText(a.id, b.id))
      .map((s) => ({
        ...s,
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

function checkId(
  label: string,
  id: string,
  report: Report,
  pattern = ID_PATTERN
) {
  if (!pattern.test(id)) report(`${label} is not a readable id`)
}

/** Checks that each id is readable and used once. `label` names an entry in a problem. */
function checkUnique(
  entries: Array<{ id: string }>,
  label: (id: string) => string,
  report: Report
) {
  const seen = new Set<string>()

  for (const { id } of entries) {
    checkId(label(id), id, report)

    if (seen.has(id)) report(`${label(id)} is used twice`)

    seen.add(id)
  }
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

interface MergedSpecies {
  species: Map<SpeciesId, SourceSpecies>
  links: EvolutionLink[]
  ownLine: Set<SpeciesId>
}

/** Generated Species facts, then the corrections, in file order. */
function mergeSpecies(sources: MapSources, report: Report): MergedSpecies {
  const species = new Map<SpeciesId, SourceSpecies>()
  const links = new Map<string, EvolutionLink>()
  const ownLine = new Set<SpeciesId>()

  for (const file of sources.generatedSpecies) {
    for (const s of file.species) {
      if (species.has(s.id)) report(`Species id "${s.id}" is used twice`)
      else species.set(s.id, structuredClone(s))
    }

    for (const link of file.evolutionLinks) links.set(linkKey(link), link)
  }

  for (const correction of sources.corrections) {
    applySpeciesCorrection(correction, { species, links, ownLine }, report)
  }

  // Generated links are filtered to the Species of the Map later; a link
  // a person added must name Species that exist.
  for (const correction of sources.corrections) {
    if (correction.op !== "add-evolution-link") continue

    const { from, to } = correction.evolutionLink

    for (const id of [from, to]) {
      if (!species.has(id)) {
        report(
          `Correction add-evolution-link ${from}>${to}: no Species "${id}"`
        )
      }
    }
  }

  return { species, links: [...links.values()], ownLine }
}

function applySpeciesCorrection(
  correction: Correction,
  merged: {
    species: Map<SpeciesId, SourceSpecies>
    links: Map<string, EvolutionLink>
    ownLine: Set<SpeciesId>
  },
  report: Report
) {
  const { species, links, ownLine } = merged

  switch (correction.op) {
    case "add-species": {
      const { id } = correction.species

      if (species.has(id)) {
        report(
          `Correction add-species "${id}": the import now has it. Remove the correction.`
        )
      } else {
        species.set(id, structuredClone(correction.species))
      }

      return
    }

    case "add-form": {
      const target = species.get(correction.species)
      const ref = `${correction.species}/${correction.form.id}`

      if (!target) {
        report(
          `Correction add-form "${ref}": no Species "${correction.species}"`
        )

        return
      }

      if (target.forms.some((f) => f.id === correction.form.id)) {
        report(
          `Correction add-form "${ref}": the import now has it. Remove the correction.`
        )

        return
      }

      target.forms.push(structuredClone(correction.form))

      return
    }

    case "set-types": {
      const ref = `${correction.species}/${correction.form}`
      const form = species
        .get(correction.species)
        ?.forms.find((f) => f.id === correction.form)
      const expected = correction.expect.join("/")

      if (!form) {
        report(`Correction set-types "${ref}": no Form "${ref}"`)

        return
      }

      if (form.types.join("/") !== expected) {
        report(
          `Correction set-types "${ref}" expects ${expected}, but the import now says ${form.types.join("/")}. Review it.`
        )

        return
      }

      form.types = [...correction.types]

      return
    }

    case "add-evolution-link": {
      const key = linkKey(correction.evolutionLink)

      if (links.has(key)) {
        report(
          `Correction add-evolution-link ${key}: the import now has it. Remove the correction.`
        )
      } else {
        links.set(key, correction.evolutionLink)
      }

      return
    }

    case "remove-evolution-link": {
      const key = linkKey(correction.evolutionLink)

      if (!links.delete(key)) {
        report(
          `Correction remove-evolution-link ${key}: the import no longer has it. Review it.`
        )
      }

      return
    }

    case "own-evolution-line":
      if (!species.has(correction.species)) {
        report(
          `Correction own-evolution-line: no Species "${correction.species}"`
        )
      }

      ownLine.add(correction.species)

      return

    default:
      return
  }
}

/** Checks ids, Forms, and types, and narrows each Form to one or two types. */
function validateSpecies(
  merged: Map<SpeciesId, SourceSpecies>,
  report: Report
): Map<SpeciesId, Omit<Species, "evolvesTo" | "evolutionLine">> {
  const species = new Map<
    SpeciesId,
    Omit<Species, "evolvesTo" | "evolutionLine">
  >()

  for (const s of merged.values()) {
    checkId(`Species id "${s.id}"`, s.id, report, SPECIES_ID_PATTERN)

    if (s.forms.length === 0) report(`Species "${s.id}" has no Form`)

    if (s.forms.length === 1 && s.forms[0]!.id !== "base") {
      report(
        `Species "${s.id}" has one Form, so its Form id must be "base", not "${s.forms[0]!.id}"`
      )
    }

    checkUnique(s.forms, (id) => `Form id "${s.id}/${id}"`, report)

    for (const form of s.forms) {
      if (form.types.length < 1 || form.types.length > 2) {
        report(
          `Form "${s.id}/${form.id}" needs one or two types; it has ${form.types.length}`
        )
      }
    }

    species.set(s.id, { ...s, forms: s.forms as Form[] })
  }

  return species
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
function evolutionLines(
  species: Map<SpeciesId, { id: SpeciesId; dex: number }>,
  links: EvolutionLink[],
  ownLine: Set<SpeciesId>
): EvolutionLines {
  const mapLinks = links.filter((l) => species.has(l.from) && species.has(l.to))
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
function mergeWildAreas(sources: MapSources, report: Report): WildAreas {
  const rows = new Map<string, RowsByGame>()
  const ignored = new Set<string>()

  for (const file of sources.generatedWild) {
    for (const [area, byGame] of Object.entries(file.areas)) {
      if (rows.has(area)) report(`Area "${area}" comes from two importers`)

      rows.set(
        area,
        new Map(Object.entries(byGame).map(([g, r]) => [g, [...(r ?? [])]]))
      )
    }
  }

  for (const correction of sources.corrections) {
    applyWildCorrection(correction, { rows, ignored }, report)
  }

  const methods = new Map(sources.methods.map((m) => [m.id, m]))

  for (const [area, byGame] of rows) {
    for (const row of [...byGame.values()].flat()) {
      const method = methods.get(row.method)

      if (!method) {
        report(`Area "${area}" uses unknown method "${row.method}"`)
      } else if (method.oneTime) {
        report(
          `Area "${area}" has a ${method.name} row (${row.species}). One-time rows are hand-written only.`
        )
      }
    }
  }

  return { rows, ignored }
}

function applyWildCorrection(
  correction: Correction,
  { rows, ignored }: WildAreas,
  report: Report
) {
  switch (correction.op) {
    case "ignore-area":
      if (!rows.has(correction.area)) {
        report(
          `Correction ignore-area "${correction.area}": the import no longer has that area.`
        )
      }

      ignored.add(correction.area)

      return

    case "remove-wild": {
      const { area, game, row } = correction
      const gameRows = rows.get(area)?.get(game) ?? []
      const index = gameRows.findIndex((r) => rowKey(r) === rowKey(row))

      if (index < 0) {
        report(
          `Correction remove-wild ${area} ${game} ${rowKey(row)}: the import no longer has that row. Review it.`
        )

        return
      }

      gameRows.splice(index, 1)

      return
    }

    case "add-wild": {
      const { area, game, row } = correction
      const areaRows = rows.get(area) ?? new Map<GameId, WildRow[]>()
      const gameRows = areaRows.get(game) ?? []

      if (gameRows.some((r) => rowKey(r) === rowKey(row))) {
        report(
          `Correction add-wild ${area} ${game} ${rowKey(row)}: the import now has that row. Remove the correction.`
        )

        return
      }

      areaRows.set(game, [...gameRows, row])
      rows.set(area, areaRows)

      return
    }

    default:
      return
  }
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

/** The Places in play order, with names per Game and their tables. */
function buildPlaces(
  sources: MapSources,
  areas: WildAreas,
  species: Map<SpeciesId, { forms: Array<{ id: string }> }>,
  report: Report
): Place[] {
  const gameIds = sources.map.games.map((g) => g.id)
  const rowsByPlace = new Map<PlaceId, RowsByGame>()
  const claimedBy = new Map<string, PlaceId>()
  const places: Place[] = []

  checkUnique(sources.map.places, (id) => `Place id "${id}"`, report)

  for (const hand of sources.map.places) {
    const names = resolveNames(hand.id, hand.name, gameIds, report)
    const rows: RowsByGame = new Map()

    for (const area of hand.areas ?? []) {
      const owner = claimedBy.get(area)
      const areaRows = areas.rows.get(area)

      if (owner)
        report(`Area "${area}" is claimed by "${owner}" and "${hand.id}"`)
      if (areas.ignored.has(area)) {
        report(`Area "${area}" is claimed by "${hand.id}" and also ignored`)
      }

      claimedBy.set(area, hand.id)

      if (!areaRows) {
        report(
          `Place "${hand.id}" claims area "${area}", which the import does not have`
        )
        continue
      }

      for (const [game, gameRows] of areaRows) {
        if (!gameIds.includes(game)) {
          report(`Area "${area}" has rows for unknown Game "${game}"`)
          continue
        }

        rows.set(game, [...(rows.get(game) ?? []), ...gameRows])
      }
    }

    rowsByPlace.set(hand.id, rows)
    places.push({
      id: hand.id,
      kind: hand.kind ?? "standard",
      names,
      tables: {},
    })
  }

  for (const area of areas.rows.keys()) {
    if (!claimedBy.has(area) && !areas.ignored.has(area)) {
      report(
        `Area "${area}" from the import belongs to no Place. Claim it in map.yaml or ignore it in corrections.yaml.`
      )
    }
  }

  addOneTimeRows(sources, rowsByPlace, report)

  const hasForm = (ref: FormRef) =>
    species.get(ref.species)?.forms.some((f) => f.id === ref.form) ?? false

  for (const place of places) {
    for (const [game, rows] of rowsByPlace.get(place.id) ?? []) {
      for (const row of rows) {
        if (!hasForm(row)) {
          report(
            `Place "${place.id}" (${game}) names unknown Species or Form "${row.species}/${row.form}"`
          )
        }
      }

      place.tables[game] = groupRows(rows, sources.methods)
    }
  }

  return places
}

function resolveNames(
  placeId: PlaceId,
  name: string | Record<GameId, string>,
  gameIds: GameId[],
  report: Report
): Record<GameId, string> {
  if (typeof name === "string") {
    return Object.fromEntries(gameIds.map((g) => [g, name]))
  }

  for (const game of Object.keys(name)) {
    if (!gameIds.includes(game)) {
      report(`Place "${placeId}" names unknown Game "${game}"`)
    }
  }

  const nameIn = (game: GameId) =>
    Object.hasOwn(name, game) ? name[game] : undefined

  for (const game of gameIds) {
    if (!nameIn(game)) {
      report(
        `Place "${placeId}" has no name for ${game}. Every Place is in every Game of its Map.`
      )
    }
  }

  return Object.fromEntries(gameIds.map((g) => [g, nameIn(g) ?? ""]))
}

function addOneTimeRows(
  sources: MapSources,
  rowsByPlace: Map<PlaceId, RowsByGame>,
  report: Report
) {
  const methods = new Map(sources.methods.map((m) => [m.id, m]))
  const gameIds = new Set(sources.map.games.map((g) => g.id))

  for (const row of sources.oneTime) {
    const label = `One-time row ${row.species}/${row.form} at "${row.place}"`
    const placeRows = rowsByPlace.get(row.place)
    const method = methods.get(row.method)

    if (!placeRows) {
      report(`${label}: no Place "${row.place}"`)
      continue
    }

    if (!method) {
      report(`${label}: unknown method "${row.method}"`)
      continue
    }

    if (!method.oneTime) {
      report(`${label}: ${method.name} is not a one-time method`)
    }

    for (const game of row.games) {
      if (!gameIds.has(game)) {
        report(`${label}: unknown Game "${game}"`)
        continue
      }

      const wildRow = {
        method: row.method,
        species: row.species,
        form: row.form,
      }

      placeRows.set(game, [...(placeRows.get(game) ?? []), wildRow])
    }
  }
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

function checkPlayOrder(places: Place[], report: Report) {
  const starters = places.filter((p) => p.kind === "starter")

  if (starters.length !== 1) {
    report(`The Map needs exactly one Starter Place; it has ${starters.length}`)
  } else if (places[0] !== starters[0]) {
    report(
      `The Starter Place "${starters[0]!.id}" must be first in the play order`
    )
  }

  const firstEvent = places.findIndex((p) => p.kind === "event")

  if (firstEvent < 0) return

  const lateStandard = places.slice(firstEvent).find((p) => p.kind !== "event")

  if (lateStandard) {
    report(
      `Place "${lateStandard.id}" comes after an Event Place. Event Places must be last in the play order.`
    )
  }
}
