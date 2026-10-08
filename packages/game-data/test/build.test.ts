import {
  cp,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { buildMaps, type BuildOptions } from "../src/build.ts"
import {
  createReader,
  evolutionLineOf,
  placeName,
  placesOf,
  type MapRegistry,
} from "../src/reader.ts"
import { fixtureSourcesDir } from "./fixture.ts"

let root: string
let options: BuildOptions

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "game-data-"))
  options = {
    sourcesDir: join(root, "sources"),
    outDir: join(root, "dist"),
    releasedDir: join(root, "released"),
    mode: "frozen",
  }

  await cp(fixtureSourcesDir, options.sourcesDir, { recursive: true })
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const lockPath = (map: string) => join(options.releasedDir, `${map}.lock.json`)
const readLockFile = async (map: string) =>
  JSON.parse(await readFile(lockPath(map), "utf8"))
const outFiles = () => readdir(options.outDir).catch(() => [])

describe("the build", () => {
  it("writes each compiled Map and a registry the reader loads", async () => {
    expect(await buildMaps(options)).toEqual([])
    expect((await outFiles()).sort()).toEqual([
      "fixture-later.json",
      "fixture.json",
      "registry.ts",
    ])

    const { registry } = (await import(
      join(options.outDir, "registry.ts")
    )) as {
      registry: MapRegistry
    }
    for (const summary of registry.catalog) {
      expect(Object.keys(summary).sort()).toEqual([
        "games",
        "generation",
        "id",
        "name",
        "region",
        "releaseOrder",
      ])
    }

    const reader = createReader(registry)
    const map = (await reader.loadMap("fixture"))!

    expect(reader.listMaps().map((m) => m.id)).toEqual([
      "fixture",
      "fixture-later",
    ])
    expect(placesOf(map, "fixture-red")[0]!.id).toBe("starter")
    expect(placeName(map, "black-city", "fixture-blue")).toBe("White Forest")
    expect(evolutionLineOf(map, "shedinja")).toBe("shedinja")
    expect(await reader.loadMap("nowhere")).toBeUndefined()
  })

  it("names the file and the path of a source with a bad shape", async () => {
    const file = join(options.sourcesDir, "maps/fixture/map.yaml")
    const yaml = await readFile(file, "utf8")

    await writeFile(
      file,
      yaml.replace("  - id: trade-house\n", "  - ids: trade-house\n")
    )

    expect(await buildMaps(options)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^maps\/fixture\/map\.yaml: places\[4\]/),
      ])
    )
  })

  it("names the Map of a compile problem and writes nothing", async () => {
    const file = join(options.sourcesDir, "maps/fixture/map.yaml")
    const yaml = await readFile(file, "utf8")

    await writeFile(file, yaml.replace("kind: event", "kind: starter"))

    expect(await buildMaps(options)).toContainEqual(
      "fixture: The Map needs exactly one Starter Place; it has 2"
    )
    expect(await outFiles()).toEqual([])
  })
})

describe("the release lock", () => {
  it("is never written by a frozen build", async () => {
    expect(await buildMaps(options)).toEqual([])
    expect(await readdir(options.releasedDir).catch(() => [])).toEqual([])
  })

  it("is created for a named Map and then kept up to date", async () => {
    expect(
      await buildMaps({ ...options, mode: "lock", maps: ["fixture"] })
    ).toEqual([])
    expect((await readLockFile("fixture")).places).toContain("hatch-town")
    await expect(readFile(lockPath("fixture-later"))).rejects.toThrow()
    expect(await buildMaps(options)).toEqual([])

    const file = join(options.sourcesDir, "maps/fixture/map.yaml")
    const yaml = await readFile(file, "utf8")

    await writeFile(
      file,
      yaml.replace(
        "  - id: hatch-town\n",
        "  - id: route-3\n    name: Route 3\n  - id: hatch-town\n"
      )
    )

    expect(await buildMaps(options)).toEqual([
      expect.stringContaining('Place "route-3" not locked'),
    ])
    expect((await readLockFile("fixture")).places).not.toContain("route-3")

    expect(await buildMaps({ ...options, mode: "lock" })).toEqual([])
    expect((await readLockFile("fixture")).places).toContain("route-3")
    expect(await buildMaps(options)).toEqual([])
  })

  it("refuses to lock an unknown Map", async () => {
    expect(
      await buildMaps({ ...options, mode: "lock", maps: ["nowhere"] })
    ).toEqual(['No Map "nowhere" to lock'])
  })
})

describe.each(["frozen", "lock"] as const)("Map identity (%s)", (mode) => {
  beforeEach(async () => {
    expect(
      await buildMaps({ ...options, mode: "lock", maps: ["fixture"] })
    ).toEqual([])

    options = { ...options, mode }
  })

  it("stops when a Map's id does not match its directory", async () => {
    await rename(
      join(options.sourcesDir, "maps/fixture-later"),
      join(options.sourcesDir, "maps/other")
    )

    expect(await buildMaps(options)).toEqual([
      'maps/other/map.yaml: the Map id "fixture-later" must match its directory "other"',
    ])
  })

  it("stops when a lock is for another Map", async () => {
    const lock = await readLockFile("fixture")

    await writeFile(
      lockPath("fixture"),
      JSON.stringify({ ...lock, map: "other" })
    )

    expect(await buildMaps(options)).toEqual([
      'The lock is for Map "other", not "fixture"',
    ])
  })

  it("stops when a released Map has no sources", async () => {
    await rm(join(options.sourcesDir, "maps/fixture"), { recursive: true })

    expect(await buildMaps(options)).toEqual([
      'Released Map "fixture" has no sources. A released Map is permanent: restore maps/fixture/.',
    ])
  })

  it("stops when a released Map is renamed", async () => {
    const yaml = await readFile(
      join(options.sourcesDir, "maps/fixture/map.yaml"),
      "utf8"
    )

    await rename(
      join(options.sourcesDir, "maps/fixture"),
      join(options.sourcesDir, "maps/fixture-renamed")
    )
    await writeFile(
      join(options.sourcesDir, "maps/fixture-renamed/map.yaml"),
      yaml.replace("id: fixture\n", "id: fixture-renamed\n")
    )

    expect(await buildMaps(options)).toEqual([
      'Released Map "fixture" has no sources. A released Map is permanent: restore maps/fixture/.',
    ])
  })
})
