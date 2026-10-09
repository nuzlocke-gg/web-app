import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import type { CompiledMap } from "../src/format.ts"
import { spritePath, UNKNOWN_SPRITE_PATH } from "../src/reader.ts"

// The real build output: run `npm run build` first (Turbo does).

const distDir = fileURLToPath(new URL("../dist", import.meta.url))

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

/** Width and height from a PNG's header chunk. */
function pngSize(bytes: Buffer) {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe("the built sprites", () => {
  it("are a 96 × 96 PNG for every Species and Form of every compiled Map, and for an unknown one", async () => {
    const mapFiles = (await readdir(distDir)).filter((f) => f.endsWith(".json"))

    expect(mapFiles).not.toEqual([])

    const unknown = await readFile(
      join(distDir, "sprites", UNKNOWN_SPRITE_PATH)
    )

    expect(pngSize(unknown)).toEqual({ width: 96, height: 96 })

    for (const file of mapFiles) {
      const map = JSON.parse(
        await readFile(join(distDir, file), "utf8")
      ) as CompiledMap

      for (const species of map.species) {
        for (const form of species.forms) {
          const path = spritePath({ species: species.id, form: form.id })
          const bytes = await readFile(join(distDir, "sprites", path))

          expect([...bytes.subarray(0, 8)], path).toEqual(PNG_SIGNATURE)
          expect(pngSize(bytes), path).toEqual({ width: 96, height: 96 })
        }
      }
    }
  })
})
