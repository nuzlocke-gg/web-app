// The build's sprite source: PokeAPI's sprites repository at one pinned
// commit, with a disk cache. Files at a commit never change, so a cached
// file never goes stale.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import type { SpriteSource } from "./sprites.ts"

/** The PokeAPI sprites commit every build reads. */
export const SPRITES_PIN = "35fdbe9bdec8f519f882c3edc3c0185f08af4d86"

const BASE_URL = `https://raw.githubusercontent.com/PokeAPI/sprites/${SPRITES_PIN}/sprites/pokemon`
const TRIES = 3
const CONCURRENT_DOWNLOADS = 16

/** Options of `pokeApiSprites`. */
export interface PokeApiSpritesOptions {
  /** Keeps downloaded files between builds. It can be deleted at any time. */
  cacheDir: string
  /** Default: the global `fetch`. */
  fetch?: typeof fetch
  /** Per try. Default 30 seconds. */
  timeoutMs?: number
  /** The wait before the second try; it grows with each try. Default 1 second. */
  backoffMs?: number
}

/**
 * Reads sprites from the pinned commit through the cache. A 404 gives
 * `undefined`; a network error, a timeout, a 429, or a 5xx is tried again,
 * and the source rejects after the last try.
 */
export function pokeApiSprites(options: PokeApiSpritesOptions): SpriteSource {
  const {
    cacheDir,
    fetch: get = fetch,
    timeoutMs = 30_000,
    backoffMs = 1_000,
  } = options
  const limit = concurrencyLimit(CONCURRENT_DOWNLOADS)

  async function download(file: string): Promise<Uint8Array | undefined> {
    const url = `${BASE_URL}/${file}.png`
    let failure: unknown

    for (let attempt = 1; attempt <= TRIES; attempt++) {
      if (attempt > 1) await sleep(backoffMs * (attempt - 1))

      try {
        const response = await get(url, {
          signal: AbortSignal.timeout(timeoutMs),
        })

        if (response.status === 404) return undefined
        if (response.ok) return new Uint8Array(await response.arrayBuffer())

        failure = `HTTP ${response.status}`

        if (!isRetryable(response.status)) break
      } catch (error) {
        failure = error
      }
    }

    throw new Error(`Could not download ${url}: ${String(failure)}`)
  }

  return async (file) => {
    const cached = join(cacheDir, SPRITES_PIN, `${file}.png`)
    const hit = await readFile(cached).catch(() => undefined)

    if (hit) return hit

    const bytes = await limit(() => download(file))

    if (bytes) await writeAtomically(cached, bytes)

    return bytes
  }
}

const isRetryable = (status: number) => status === 429 || status >= 500

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A build that stops mid-write leaves no partial file in the cache. */
async function writeAtomically(path: string, bytes: Uint8Array) {
  const partial = `${path}.${process.pid}.partial`

  await mkdir(dirname(path), { recursive: true })
  await writeFile(partial, bytes)
  await rename(partial, path)
}

/** Runs at most `limit` tasks at once; a finished task hands its slot on. */
function concurrencyLimit(limit: number) {
  let active = 0
  const waiting: Array<() => void> = []

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active < limit) active++
    else await new Promise<void>((resolve) => waiting.push(resolve))

    try {
      return await task()
    } finally {
      const next = waiting.shift()

      if (next) next()
      else active--
    }
  }
}
