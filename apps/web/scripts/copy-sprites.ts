// Copies the sprites that @workspace/game-data built into public/sprites/,
// where every URL from `spriteUrl` points. Runs before `next dev` and
// `next build`; the root `npm run dev` and `npm run build` build the package
// first.

import { access, cp, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { spritesDir } from "@workspace/game-data/sprites-dir"

const publicSprites = fileURLToPath(
  new URL("../public/sprites", import.meta.url)
)

try {
  await access(spritesDir)
} catch {
  console.error(
    `No sprites at ${spritesDir}. Build @workspace/game-data first: run the root \`npm run dev\` or \`npm run build\`.`
  )
  process.exit(1)
}

await rm(publicSprites, { recursive: true, force: true })
await cp(spritesDir, publicSprites, { recursive: true })
