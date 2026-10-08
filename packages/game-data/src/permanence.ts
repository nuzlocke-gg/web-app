import type { CompiledMap, ReleaseLock } from "./format.ts"

const formKeys = (map: CompiledMap) =>
  map.species.flatMap((s) => s.forms.map((f) => `${s.id}/${f.id}`))

const union = (locked: string[], current: string[]) => [
  ...new Set([...locked, ...current]),
]

/**
 * The lock after this release: every id of `previous` plus every id of
 * `map`. A locked Species keeps its locked dex number.
 */
export function lockFor(map: CompiledMap, previous?: ReleaseLock): ReleaseLock {
  const species: Record<string, number> = { ...previous?.species }

  for (const s of map.species) {
    if (!Object.hasOwn(species, s.id)) species[s.id] = s.dex
  }

  return {
    map: map.id,
    games: union(
      previous?.games ?? [],
      map.games.map((g) => g.id)
    ),
    places: union(
      previous?.places ?? [],
      map.places.map((p) => p.id)
    ),
    species,
    forms: union(previous?.forms ?? [], formKeys(map)),
  }
}

/**
 * The problems that stop a release, each naming the identifier. With no
 * lock (before launch) there are none. `frozen` also stops when the lock
 * would gain new ids, so that a new id ships only once it is locked.
 */
export function checkPermanence(
  map: CompiledMap,
  lock: ReleaseLock | undefined,
  { frozen }: { frozen: boolean }
): string[] {
  if (!lock) return []

  const problems: string[] = []
  const games = new Set(map.games.map((g) => g.id))
  const places = new Set(map.places.map((p) => p.id))
  const species = new Map(map.species.map((s) => [s.id, s]))
  const forms = new Set(formKeys(map))

  if (lock.map !== map.id) {
    problems.push(`The lock is for Map "${lock.map}", not "${map.id}"`)
  }

  for (const game of lock.games) {
    if (!games.has(game)) {
      problems.push(`Released Game "${game}" no longer resolves in this Map`)
    }
  }

  for (const place of lock.places) {
    if (!places.has(place)) {
      problems.push(
        `Released Place "${place}" no longer resolves. Runs that recorded it would show an unknown location.`
      )
    }
  }

  for (const [id, dex] of Object.entries(lock.species)) {
    const current = species.get(id)

    if (!current) {
      problems.push(`Released Species "${id}" no longer resolves`)
    } else if (current.dex !== dex) {
      problems.push(
        `Released Species "${id}" changed meaning: dex ${dex} is now ${current.dex}`
      )
    }
  }

  for (const form of lock.forms) {
    if (!forms.has(form)) {
      problems.push(`Released Form "${form}" no longer resolves`)
    }
  }

  const unlocked = frozen ? unlockedIds(map, lock) : []

  if (unlocked.length > 0) {
    problems.push(
      `The lock for "${map.id}" is out of date: ${unlocked.join(", ")} not locked. Run \`npm run lock\` and commit the lock.`
    )
  }

  return problems
}

function unlockedIds(map: CompiledMap, lock: ReleaseLock): string[] {
  const next = lockFor(map, lock)
  const added = (kind: string, ids: string[], locked: string[]) =>
    ids.filter((id) => !locked.includes(id)).map((id) => `${kind} "${id}"`)

  return [
    ...added("Game", next.games, lock.games),
    ...added("Place", next.places, lock.places),
    ...added("Species", Object.keys(next.species), Object.keys(lock.species)),
    ...added("Form", next.forms, lock.forms),
  ]
}
