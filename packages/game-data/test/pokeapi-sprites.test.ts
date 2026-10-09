import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { pokeApiSprites, SPRITES_PIN } from "../src/pokeapi-sprites.ts"

const PNG = new Uint8Array([137, 80, 78, 71])

let cacheDir: string

beforeEach(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), "pokeapi-sprites-"))
})

afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true })
})

/**
 * A fake `fetch` that answers each call with the next reply in turn: an HTTP
 * status, a network error, or no answer until the request is aborted.
 */
function replies(...answers: Array<number | "reject" | "hang">) {
  return vi.fn((_url: string | URL | Request, init?: RequestInit) => {
    const answer = answers.shift()

    if (answer === "reject")
      return Promise.reject(new TypeError("fetch failed"))

    if (answer === "hang") {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal!.reason)
        )
      })
    }

    const body = answer === 200 ? PNG : null

    return Promise.resolve(new Response(body, { status: answer }))
  })
}

const sourceWith = (fetch: ReturnType<typeof replies>) =>
  pokeApiSprites({
    cacheDir,
    fetch: fetch as typeof globalThis.fetch,
    timeoutMs: 20,
    backoffMs: 1,
  })

const cachedFiles = () =>
  readdir(join(cacheDir, SPRITES_PIN)).catch(() => [] as string[])

describe("the PokeAPI sprite source", () => {
  it("downloads a file at the pinned commit and caches it", async () => {
    const fetch = replies(200)

    expect(await sourceWith(fetch)("201-b")).toEqual(PNG)
    expect(fetch).toHaveBeenCalledWith(
      `https://raw.githubusercontent.com/PokeAPI/sprites/${SPRITES_PIN}/sprites/pokemon/201-b.png`,
      expect.anything()
    )
    expect(
      new Uint8Array(await readFile(join(cacheDir, SPRITES_PIN, "201-b.png")))
    ).toEqual(PNG)
  })

  it("reads a cached file without the network", async () => {
    await sourceWith(replies(200))("1")

    const fetch = replies()

    expect(new Uint8Array((await sourceWith(fetch)("1"))!)).toEqual(PNG)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("gives undefined for a missing file and caches nothing", async () => {
    expect(await sourceWith(replies(404))("386-attack")).toBeUndefined()
    expect(await cachedFiles()).toEqual([])
  })

  it("tries again after a server error or a network error", async () => {
    expect(await sourceWith(replies(500, 200))("1")).toEqual(PNG)
    expect(await sourceWith(replies("reject", 200))("2")).toEqual(PNG)
    expect(await sourceWith(replies(429, 200))("3")).toEqual(PNG)
  })

  it("rejects, naming the file, after the last try", async () => {
    const fetch = replies(500, 500, 500)

    await expect(sourceWith(fetch)("1")).rejects.toThrow(/1\.png: HTTP 500/)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(await cachedFiles()).toEqual([])
  })

  it("does not try again after another client error", async () => {
    const fetch = replies(403)

    await expect(sourceWith(fetch)("1")).rejects.toThrow(/HTTP 403/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("stops a download that does not answer in time", async () => {
    const fetch = replies("hang", "hang", "hang")

    await expect(sourceWith(fetch)("1")).rejects.toThrow(/1\.png/)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(await cachedFiles()).toEqual([])
  })
})
