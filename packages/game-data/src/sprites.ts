// The sprite step of the build: one sprite for every Species and Form of
// every compiled Map, from PokeAPI's default front sprites.

import { err, ok, type Result } from "serializable-result"

import type { CompiledMap, Species, SpriteOverrides } from "./format.ts"
import { spritePath, UNKNOWN_SPRITE_PATH } from "./reader.ts"

/**
 * Gives one file of PokeAPI's `sprites/pokemon/` by its name without `.png`
 * (`"386"`, `"201-b"`), or `undefined` when the file does not exist.
 * Rejects when the file cannot be read.
 */
export type SpriteSource = (file: string) => Promise<Uint8Array | undefined>

/** Every sprite of a build: its bytes by `spritePath`, and the unknown sprite. */
export type SpriteFiles = Map<string, Uint8Array>

/** PokeAPI's placeholder: a grey question mark on a white disc. */
const UNKNOWN_SPRITE_FILE = "0"

/** The file one Form reads, and whether the build stops without it. */
interface FormPlan {
  path: string
  file: string
  /** A first Form or an override must exist; another Form falls back. */
  required: boolean
}

/**
 * The sprites of every Species and Form of `maps`, and the unknown sprite.
 * A Form uses its override in `sprites.yaml`; else the first Form uses
 * `<dex>.png`, and another Form uses `<dex>-<form>.png` when it exists, else
 * the first Form's sprite.
 *
 * Problems are an error result that names them: an override for no Form, a
 * dex number that several Species share without overrides, a ROM-hack
 * Species without one, a missing required file, or a Form that two Maps
 * give different sprites. A source that rejects makes this reject.
 */
export async function resolveSprites(
  maps: CompiledMap[],
  overrides: SpriteOverrides,
  source: SpriteSource
): Promise<Result<SpriteFiles, string[]>> {
  const species = maps.flatMap((map) => map.species)
  const problems = checkOverrides(species, overrides)

  if (problems.length > 0) return err(problems)

  const read = onceEach(source)
  const plans = species.map((s) => planOf(s, overrides))
  const unknownSprite = await read(UNKNOWN_SPRITE_FILE)
  const sprites = await Promise.all(
    plans.map((forms) => Promise.all(forms.map((form) => read(form.file))))
  )

  return assembleSprites(unknownSprite, plans, sprites)
}

/** Overrides that name no Form, and Species that need an override. */
function checkOverrides(
  species: Species[],
  overrides: SpriteOverrides
): string[] {
  const problems = new Set<string>()
  const forms = new Set(
    species.flatMap((s) => s.forms.map((f) => `${s.id}/${f.id}`))
  )
  const byDex = new Map<number, Set<string>>()
  const hasOwnSprite = (s: Species) =>
    Object.hasOwn(overrides, `${s.id}/${s.forms[0]!.id}`)

  for (const key of Object.keys(overrides)) {
    if (!forms.has(key)) {
      problems.add(`sprites.yaml: "${key}" is not a Form of any Map`)
    }
  }

  for (const s of species) {
    if (hasOwnSprite(s)) continue

    if (s.id.includes(":")) {
      problems.add(
        `${s.id}: a ROM-hack Species needs a sprite for its first Form in sprites.yaml`
      )
    }

    byDex.set(s.dex, (byDex.get(s.dex) ?? new Set()).add(s.id))
  }

  for (const [dex, ids] of byDex) {
    if (ids.size > 1) {
      problems.add(
        `${[...ids].join(", ")} share dex ${dex}: give all but one a sprite for its first Form in sprites.yaml`
      )
    }
  }

  return [...problems]
}

/** The file each Form of a Species reads, the first Form first. */
function planOf(species: Species, overrides: SpriteOverrides): FormPlan[] {
  return species.forms.map((form, i) => {
    const key = `${species.id}/${form.id}`
    const path = spritePath({ species: species.id, form: form.id })

    if (Object.hasOwn(overrides, key)) {
      return { path, file: overrides[key]!, required: true }
    }

    if (i === 0) return { path, file: String(species.dex), required: true }

    return { path, file: `${species.dex}-${form.id}`, required: false }
  })
}

function assembleSprites(
  unknownSprite: Uint8Array | undefined,
  plans: FormPlan[][],
  sprites: Array<Array<Uint8Array | undefined>>
): Result<SpriteFiles, string[]> {
  const problems = new Set<string>()
  const files: SpriteFiles = new Map()

  if (unknownSprite) files.set(UNKNOWN_SPRITE_PATH, unknownSprite)
  else
    problems.add(
      `no unknown sprite ${UNKNOWN_SPRITE_FILE}.png at the pinned commit`
    )

  for (const [i, forms] of plans.entries()) {
    const firstSprite = sprites[i]![0]

    for (const [j, { path, file, required }] of forms.entries()) {
      const bytes = sprites[i]![j] ?? (required ? undefined : firstSprite)
      const previous = files.get(path)

      if (!bytes) {
        if (required)
          problems.add(`${path}: no sprite ${file}.png at the pinned commit`)
        continue
      }

      if (previous && previous !== bytes) {
        problems.add(`${path}: two Maps give this Form different sprites`)
      }

      files.set(path, bytes)
    }
  }

  if (problems.size > 0) return err([...problems])

  return ok(files)
}

/** Reads each file once, so a Species in several Maps gives one array. */
function onceEach(source: SpriteSource): SpriteSource {
  const reads = new Map<string, Promise<Uint8Array | undefined>>()

  return (file) => {
    const read = reads.get(file) ?? source(file)

    reads.set(file, read)

    return read
  }
}
