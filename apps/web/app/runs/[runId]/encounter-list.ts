import { searchPlaces, type PlaceId, type PlaceRow } from "@workspace/game-data"

import { byTimeOfEntry } from "@/lib/runs/changes/record-encounter"
import {
  viewerJourney,
  type EncounterState,
  type RunState,
} from "@/lib/runs/state"

/**
 * The locations of the Encounters tab: the Starter first, then each location
 * in the order of its first Encounter in any Journey of the Run. A location
 * joins when it gets its first Encounter and moves when that one is removed.
 */
export function listedPlaces(places: PlaceRow[], run: RunState): PlaceRow[] {
  const firstEncounters = firstEncounterByPlace(run)
  const starter = places.find((place) => place.kind === "starter")
  const others = places
    .filter(
      (place) => place.kind !== "starter" && firstEncounters.has(place.id)
    )
    .sort((a, b) =>
      byTimeOfEntry(firstEncounters.get(a.id)!, firstEncounters.get(b.id)!)
    )

  return starter ? [starter, ...others] : others
}

function firstEncounterByPlace(run: RunState): Map<PlaceId, EncounterState> {
  const first = new Map<PlaceId, EncounterState>()

  for (const journey of run.journeys) {
    for (const encounter of journey.encounters) {
      const earlier = first.get(encounter.placeId)

      if (!earlier || byTimeOfEntry(encounter, earlier) < 0) {
        first.set(encounter.placeId, encounter)
      }
    }
  }

  return first
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
 * Encounters. Event Places count on neither side.
 * @param listed The Encounters list from {@link listedPlaces}; the cells keep its order.
 * @param total The Map's Progress denominator, from `progressTotal(map)`.
 * @example
 * const listed = listedPlaces(placesOf(map, gameId), run)
 * const progress = progressOf(listed, run, progressTotal(map))
 */
export function progressOf(
  listed: PlaceRow[],
  run: RunState,
  total: number
): Progress {
  const encountered = placesWithEncounters(run)
  const viewerEncounters = viewerJourney(run).encounters
  const counted = listed.filter(
    (place) => place.kind !== "event" && encountered.has(place.id)
  )
  const cells = counted.map((place) =>
    cellOf(
      viewerEncounters.filter((encounter) => encounter.placeId === place.id)
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

function placesWithEncounters(run: RunState): Set<PlaceId> {
  return new Set(
    run.journeys.flatMap((journey) =>
      journey.encounters.map((encounter) => encounter.placeId)
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
  places: PlaceRow[]
}

/**
 * The groups of the Add a location Drawer, each A to Z with numbers in order
 * (Route 9 before Route 10). Remaining lists the locations with no Encounter
 * in any Journey, then the Event locations with none. A query searches every
 * location, whatever the view. Empty groups are left out.
 */
export function placeChoices(
  places: PlaceRow[],
  run: RunState,
  view: PlaceView,
  query: string
): PlaceChoiceGroup[] {
  const sorted = [...places].sort(byName)

  if (query.trim()) {
    return nonEmpty([
      { title: "Results", note: "", places: searchPlaces(sorted, query) },
    ])
  }

  if (view === "all") {
    return [{ title: "All locations", note: "A to Z", places: sorted }]
  }

  const encountered = placesWithEncounters(run)
  const open = sorted.filter((place) => !encountered.has(place.id))

  return nonEmpty([
    {
      title: "No encounter yet",
      note: "A to Z",
      places: open.filter((place) => place.kind !== "event"),
    },
    {
      title: "Event locations",
      note: "Not counted",
      places: open.filter((place) => place.kind === "event"),
    },
  ])
}

function byName(a: PlaceRow, b: PlaceRow): number {
  return a.name.localeCompare(b.name, "en", {
    numeric: true,
    sensitivity: "base",
  })
}

function nonEmpty(groups: PlaceChoiceGroup[]): PlaceChoiceGroup[] {
  return groups.filter((group) => group.places.length > 0)
}
