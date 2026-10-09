// Compiles sources/ into dist/, runs the permanence check, and writes the
// sprites (downloaded from the pinned PokeAPI commit on a cache miss).
//   node scripts/compile.ts --frozen        every build and CI: never writes a lock
//   node scripts/compile.ts --lock [map…]   updates existing locks; names Maps to lock at launch

import { fileURLToPath } from "node:url"

import { buildMaps } from "../src/build.ts"
import { pokeApiSprites } from "../src/pokeapi-sprites.ts"

const [flag, ...maps] = process.argv.slice(2)

if (flag !== "--frozen" && flag !== "--lock") {
  console.error("Usage: compile.ts --frozen | --lock [map…]")
  process.exit(2)
}

const packageDir = (path: string) =>
  fileURLToPath(new URL(`../${path}`, import.meta.url))

const built = await buildMaps({
  sourcesDir: packageDir("sources"),
  outDir: packageDir("dist"),
  releasedDir: packageDir("released"),
  mode: flag === "--frozen" ? "frozen" : "lock",
  maps,
  sprites: pokeApiSprites({
    cacheDir: packageDir("node_modules/.cache/pokeapi-sprites"),
  }),
})

if (!built.ok) {
  console.error(`The game data compile stopped:\n  ${built.error.join("\n  ")}`)
  process.exit(1)
}
