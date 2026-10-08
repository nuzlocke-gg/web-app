import { fileURLToPath } from "node:url"

import { compileMap } from "../src/compile.ts"
import type { CompiledMap, MapSources } from "../src/format.ts"
import { readMapSources } from "../src/sources.ts"

export const fixtureSourcesDir = fileURLToPath(
  new URL("./fixtures/sources", import.meta.url)
)

/** The parsed sources of a fixture Map. Each call gives a fresh copy to change. */
export async function fixtureSources(map = "fixture"): Promise<MapSources> {
  const parsed = await readMapSources(fixtureSourcesDir, map)

  if (!parsed.ok) throw new Error(parsed.problems.join("\n"))

  return parsed.value
}

/** A fixture Map, compiled from its sources. */
export async function compiledFixture(map = "fixture"): Promise<CompiledMap> {
  const result = compileMap(await fixtureSources(map))

  if (!result.ok) throw new Error(result.problems.join("\n"))

  return result.map
}
