// Imports one Map's wild tables and Species facts from PokeAPI at the pinned
// commit. A one-off generator: commit its output and review it as a diff.
//   node scripts/import-pokeapi.ts <map>

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { parse } from "csv-parse/sync"

import {
  importPokeApi,
  POKEAPI_FILES,
  POKEAPI_PIN,
  type PokeApiTables,
} from "../importers/pokeapi.ts"
import { readHandMap } from "../src/sources.ts"

const FETCH_TIMEOUT_MS = 60_000

const [mapDir] = process.argv.slice(2)

if (!mapDir) {
  console.error("Usage: import-pokeapi.ts <map>")
  process.exit(2)
}

const sourcesDir = fileURLToPath(new URL("../sources", import.meta.url))
const map = await readHandMap(sourcesDir, mapDir)

if (!map.ok) {
  console.error(map.error.join("\n"))
  process.exit(1)
}

const imported = importPokeApi(await fetchTables(), {
  generation: map.value.generation,
  games: map.value.games.map((game) => game.id),
})
const generatedDir = join(sourcesDir, "maps", mapDir, "generated")

await mkdir(generatedDir, { recursive: true })
await writeJson(join(generatedDir, "pokeapi.wild.json"), imported.wild)
await writeJson(join(generatedDir, "pokeapi.species.json"), imported.species)

async function fetchTables(): Promise<PokeApiTables> {
  const entries = await Promise.all(
    POKEAPI_FILES.map(async (file) => {
      const url = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${POKEAPI_PIN}/data/v2/csv/${file}.csv`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })

      if (!response.ok) throw new Error(`${url}: ${response.status}`)

      return [file, parse(await response.text(), { columns: true })]
    })
  )

  return Object.fromEntries(entries) as PokeApiTables
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}
