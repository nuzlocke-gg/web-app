// The sprite step of the build: one sprite for every Species and Form of
// every compiled Map, from PokeAPI's default front sprites.

import { createHash } from "node:crypto"
import { err, ok, type Result } from "serializable-result"

import type { CompiledMap, Species } from "./format.ts"
import { spritePath, UNKNOWN_SPRITE_PATH } from "./reader.ts"

/**
 * Gives one file of PokeAPI's `sprites/pokemon/` by its name without `.png`
 * (`"386"`, `"201-b"`), or `undefined` when the file does not exist.
 * Rejects when the file cannot be read.
 */
export type SpriteSource = (file: string) => Promise<Uint8Array | undefined>

/** Every sprite of a build, and the version that names them. */
export interface SpriteSet {
  /** Changes whenever a path or the bytes of a sprite change. */
  version: string
  /** The bytes of each sprite, by `spritePath`. */
  files: Map<string, Uint8Array>
}

/** PokeAPI's placeholder: a grey question mark, in the style of the sprites. */
const UNKNOWN_SPRITE_FILE = "0"

/** What the source gave for one Species. */
interface SpeciesFiles {
  species: Species
  /** `<dex>.png`, for the first Form. */
  defaultSprite: Uint8Array | undefined
  /** `<dex>-<form>.png` for each Form after the first, in Form order. */
  formSprites: Array<Uint8Array | undefined>
}

/**
 * The sprites of every Species and Form of `maps`, and the sprite for an
 * unknown Pokémon. The first Form has the Species' default sprite. Another
 * Form has its own sprite when the source has one, else the first Form's.
 *
 * A missing unknown sprite, a Species with no default sprite, or a Form that
 * two Maps give different sprites, is an error result naming it. A source
 * that rejects makes this reject.
 */
export async function resolveSprites(
  maps: CompiledMap[],
  source: SpriteSource
): Promise<Result<SpriteSet, string[]>> {
  const read = onceEach(source)
  const unknownSprite = await read(UNKNOWN_SPRITE_FILE)
  const species = maps.flatMap((map) => map.species)
  const speciesFiles = await Promise.all(
    species.map(async (s): Promise<SpeciesFiles> => ({
      species: s,
      defaultSprite: await read(String(s.dex)),
      formSprites: await Promise.all(
        s.forms.slice(1).map((form) => read(`${s.dex}-${form.id}`))
      ),
    }))
  )

  return assembleSprites(unknownSprite, speciesFiles)
}

function assembleSprites(
  unknownSprite: Uint8Array | undefined,
  speciesFiles: SpeciesFiles[]
): Result<SpriteSet, string[]> {
  const problems = new Set<string>()
  const files = new Map<string, Uint8Array>()

  if (unknownSprite) files.set(UNKNOWN_SPRITE_PATH, unknownSprite)
  else
    problems.add(
      `no unknown sprite ${UNKNOWN_SPRITE_FILE}.png at the pinned commit`
    )

  for (const { species, defaultSprite, formSprites } of speciesFiles) {
    if (!defaultSprite) {
      problems.add(
        `${species.id}: no sprite ${species.dex}.png at the pinned commit`
      )
      continue
    }

    for (const [i, form] of species.forms.entries()) {
      const path = spritePath({ species: species.id, form: form.id })
      const ownSprite = i === 0 ? defaultSprite : formSprites[i - 1]
      const bytes = ownSprite ?? defaultSprite
      const previous = files.get(path)

      if (previous && previous !== bytes) {
        problems.add(`${path}: two Maps give this Form different sprites`)
      }

      files.set(path, bytes)
    }
  }

  if (problems.size > 0) return err([...problems])

  return ok({ version: versionOf(files), files })
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

/** The first 12 hex digits of a hash over every path and its bytes. */
function versionOf(files: Map<string, Uint8Array>): string {
  const hash = createHash("sha256")

  for (const path of [...files.keys()].sort()) {
    const bytes = files.get(path)!

    hash.update(`${path}\0${bytes.length}\0`)
    hash.update(bytes)
  }

  return hash.digest("hex").slice(0, 12)
}
