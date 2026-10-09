// Compiles sources/ into dist/ and runs the permanence check.
//   node scripts/compile.ts --frozen        every build and CI: never writes a lock
//   node scripts/compile.ts --lock [map…]   updates existing locks; names Maps to lock at launch

import { fileURLToPath } from "node:url"

import { buildMaps } from "../src/build.ts"

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
})

if (!built.ok) {
  console.error(`The game data compile stopped:\n  ${built.error.join("\n  ")}`)
  process.exit(1)
}
