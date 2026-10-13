import {
  placesOf,
  searchPlaces,
  type GameId,
  type LoadedMap,
  type PlaceKind,
} from "@workspace/game-data"

import { speciesName } from "@/components/species-name"
import { admitsChanges } from "@/lib/runs/can-change"
import { customPlaceNameTaken, sameName } from "@/lib/runs/custom-place-name"
import { placeKey, samePlace, type PlaceRef } from "@/lib/runs/place"
import {
  byTimeOfEntry,
  viewerJourney,
  type EncounterState,
  type PokemonState,
  type RunState,
} from "@/lib/runs/state"

/**
 * One location of a Run as the tracking screen shows it: a Place of the
 * viewer's Game, or a Custom location of the Run (`kind` "custom"). Only the
 * Starter and standard locations count in Progress.
 */
export type LocationRow = {
  place: PlaceRef
  kind: PlaceKind | "custom"
  /** The name in the viewer's Game, or the Custom location's name. */
  name: string
}

/**
 * Every location of the Run for the viewer: the Places of their Game in play
 * order, then the Run's Custom locations in the order they were added.
 */
export function locationsOf(
  map: LoadedMap,
  run: RunState,
  gameId: GameId
): LocationRow[] {
  const gamePlaces = placesOf(map, gameId).map((row): LocationRow => ({
    place: { kind: "game", id: row.id },
    kind: row.kind,
    name: row.name,
  }))
  const customPlaces = run.customPlaces.map((custom): LocationRow => ({
    place: { kind: "custom", id: custom.id },
    kind: "custom",
    name: custom.name,
  }))

  return [...gamePlaces, ...customPlaces]
}

/**
 * The locations of the Encounters tab: the Starter first, then each location
 * in the order of its first Encounter in any Journey of the Run. A location
 * joins when it gets its first Encounter and moves when that one is removed.
 * A Custom location joins when it is added, in that order until it has an
 * Encounter.
 */
export function listedPlaces(
  locations: LocationRow[],
  run: RunState
): LocationRow[] {
  const firstEncounters = firstEncounterByPlace(run)
  const orderOf = (location: LocationRow) =>
    firstEncounters.get(placeKey(location.place)) ?? addedAt(location.place)
  const starter = locations.find((location) => location.kind === "starter")
  const others = locations
    .filter(
      (location) =>
        location.kind !== "starter" &&
        (location.kind === "custom" ||
          firstEncounters.has(placeKey(location.place)))
    )
    .sort((a, b) => byTimeOfEntry(orderOf(a), orderOf(b)))

  return starter ? [starter, ...others] : others
}

// A Custom location with no Encounter sorts by the time in its UUID v7 id:
// the first 48 bits are epoch milliseconds.
function addedAt(place: PlaceRef): { id: string; enteredAt: number } {
  const hex = place.id.replaceAll("-", "").slice(0, 12)

  return { id: place.id, enteredAt: Number.parseInt(hex, 16) }
}

function firstEncounterByPlace(run: RunState): Map<string, EncounterState> {
  const first = new Map<string, EncounterState>()

  for (const journey of run.journeys) {
    for (const encounter of journey.encounters) {
      const place = placeKey(encounter.place)
      const earlier = first.get(place)

      if (!earlier || byTimeOfEntry(encounter, earlier) < 0) {
        first.set(place, encounter)
      }
    }
  }

  return first
}

/**
 * How many Slots a location has: the distinct Slots of every Journey there,
 * so partners who share a Slot count it once.
 */
export function slotCount(run: RunState, place: PlaceRef): number {
  const slots = run.journeys.flatMap((journey) =>
    journey.encounters
      .filter((encounter) => samePlace(encounter.place, place))
      .map((encounter) => encounter.slot)
  )

  return new Set(slots).size
}

/**
 * The button a location of the Encounters list shows in place of its rows:
 * "Record your starter" while the viewer has no starter, and "Record an
 * encounter" while no Journey has a Slot at a Custom location of an Active
 * Run. A partner's Slot there is one to fill, not a new one, so it shows no
 * button. Null otherwise.
 */
export function recordPromptOf(
  run: RunState,
  location: LocationRow
): "starter" | "custom" | null {
  const viewerHasOne = viewerJourney(run).encounters.some((encounter) =>
    samePlace(encounter.place, location.place)
  )

  if (location.kind === "starter" && !viewerHasOne) return "starter"

  // The Starter's button stays on a Run that is not Active: a save there is
  // refused, and the refusal refreshes a canon that is out of date.
  if (
    location.kind === "custom" &&
    admitsChanges(run) &&
    slotCount(run, location.place) === 0
  ) {
    return "custom"
  }

  return null
}

/**
 * What became of an Encounter, under its Species met: the nickname, "now
 * Grovyle" once the Species differs from the met one, then where the Pokémon
 * is, or how it died.
 * @param pokemon The Encounter's Pokémon; none for a Failed Encounter.
 * @example
 * fateLine(map, encounter, pokemon) // "Leafy · now Grovyle · Party"
 */
export function fateLine(
  map: LoadedMap,
  encounter: EncounterState,
  pokemon: PokemonState | undefined
): string {
  if (!pokemon) {
    return encounter.outcome === "failed" ? "Failed" : "Unknown outcome"
  }

  const current = pokemon.species.species
  const evolved = encounter.met && current !== encounter.met.species
  const currentName = speciesName(map, current)

  return [
    pokemon.nickname ?? "No nickname",
    evolved ? `now ${currentName}` : null,
    lifeOf(pokemon),
  ]
    .filter((part) => part !== null)
    .join(" · ")
}

function lifeOf(pokemon: PokemonState): string {
  if (pokemon.removedAt !== null) return "Removed"

  if (pokemon.diedAt !== null) {
    return pokemon.deathLevel === null
      ? "died"
      : `died at Lv ${pokemon.deathLevel}`
  }

  return pokemon.inParty ? "Party" : "Box"
}

/** How one location shows in the Progress block. */
export type ProgressCell = "caught" | "failed" | "unknown"

/** The Progress of a Run, as the end of the Encounters list shows it. */
export type Progress = {
  /** One per location with an Encounter, in the order of the list. */
  cells: ProgressCell[]
  caught: number
  failed: number
  /** Locations whose outcomes a newer build stored. */
  unknown: number
  /** Locations with an Encounter. */
  done: number
  /** Locations with no Encounter yet. */
  remaining: number
  total: number
}

/**
 * The Progress of a Run over its listed locations. A location counts when any
 * Journey has an Encounter there; its cell comes from the viewer's own
 * Encounters. Event and Custom locations count on neither side.
 * @param listed The Encounters list from {@link listedPlaces}; the cells keep its order.
 * @param total The Map's Progress denominator, from `progressTotal(map)`.
 * @example
 * const listed = listedPlaces(placesOf(map, gameId), run)
 * const progress = progressOf(listed, run, progressTotal(map))
 */
export function progressOf(
  listed: LocationRow[],
  run: RunState,
  total: number
): Progress {
  const encountered = placesWithEncounters(run)
  const viewerEncounters = viewerJourney(run).encounters
  const counted = listed.filter(
    (location) =>
      countsInProgress(location) && encountered.has(placeKey(location.place))
  )
  const cells = counted.map((location) =>
    cellOf(
      viewerEncounters.filter((encounter) =>
        samePlace(encounter.place, location.place)
      )
    )
  )
  const countOf = (cell: ProgressCell) =>
    cells.filter((candidate) => candidate === cell).length

  return {
    cells,
    caught: countOf("caught"),
    failed: countOf("failed"),
    unknown: countOf("unknown"),
    done: counted.length,
    remaining: total - counted.length,
    total,
  }
}

// A location where only a partner has an Encounter reads as unknown until
// the Soul Link milestone adds Missing cells.
function cellOf(encounters: EncounterState[]): ProgressCell {
  if (encounters.some((encounter) => encounter.outcome === "caught")) {
    return "caught"
  }

  const allFailed =
    encounters.length > 0 &&
    encounters.every((encounter) => encounter.outcome === "failed")

  return allFailed ? "failed" : "unknown"
}

function countsInProgress(location: LocationRow): boolean {
  return location.kind === "starter" || location.kind === "standard"
}

function placesWithEncounters(run: RunState): Set<string> {
  return new Set(
    run.journeys.flatMap((journey) =>
      journey.encounters.map((encounter) => placeKey(encounter.place))
    )
  )
}

/** Which locations the Add a location Drawer lists. */
export type PlaceView = "remaining" | "all"

/** One titled group of locations in the Add a location Drawer. */
export type PlaceChoiceGroup = {
  title: string
  /** Shown beside the title, such as "A to Z". */
  note: string
  places: LocationRow[]
}

/**
 * The groups of the Add a location Drawer, each A to Z with numbers in order
 * (Route 9 before Route 10). Remaining lists the locations with no Encounter
 * in any Journey, then the Event locations with none; All lists every
 * location of the Game. Both end with the Run's Custom locations. A query
 * searches every location, whatever the view. Empty groups are left out.
 */
export function placeChoices(
  locations: LocationRow[],
  run: RunState,
  view: PlaceView,
  query: string
): PlaceChoiceGroup[] {
  const sorted = [...locations].sort(byName)

  if (query.trim()) {
    return nonEmpty([
      { title: "Results", note: "", places: searchPlaces(sorted, query) },
    ])
  }

  const custom = {
    title: "Custom locations",
    note: "",
    places: sorted.filter((location) => location.kind === "custom"),
  }
  const ofGame = sorted.filter((location) => location.kind !== "custom")

  if (view === "all") {
    return nonEmpty([
      { title: "All locations", note: "A to Z", places: ofGame },
      custom,
    ])
  }

  const encountered = placesWithEncounters(run)
  const open = ofGame.filter(
    (location) => !encountered.has(placeKey(location.place))
  )

  return nonEmpty([
    {
      title: "No encounter yet",
      note: "A to Z",
      places: open.filter((location) => location.kind !== "event"),
    },
    {
      title: "Event locations",
      note: "Not counted",
      places: open.filter((location) => location.kind === "event"),
    },
    custom,
  ])
}

/**
 * Whether a location of the Run already has this name, trimmed, in any letter
 * case: a Place in the Game of any Journey (a Place can have another name in
 * a partner's Game), or a Custom location.
 * @param map The Run's Map; while it loads, only Custom locations are compared.
 * @param exceptId The Custom location being renamed, which may keep its name.
 */
export function locationNameTaken(
  map: LoadedMap | undefined,
  run: RunState,
  name: string,
  exceptId?: string
): boolean {
  const gameIds = new Set(run.journeys.map((journey) => journey.gameId))
  const gamePlaceNames = map
    ? [...gameIds].flatMap((gameId) =>
        placesOf(map, gameId).map((row) => row.name)
      )
    : []

  return (
    gamePlaceNames.some((placeName) => sameName(placeName, name)) ||
    customPlaceNameTaken(run, name, exceptId)
  )
}

function byName(a: LocationRow, b: LocationRow): number {
  return a.name.localeCompare(b.name, "en", {
    numeric: true,
    sensitivity: "base",
  })
}

function nonEmpty(groups: PlaceChoiceGroup[]): PlaceChoiceGroup[] {
  return groups.filter((group) => group.places.length > 0)
}
