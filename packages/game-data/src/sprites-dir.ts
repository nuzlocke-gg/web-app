// For build scripts only: the app serves this directory, it does not import it.

import { fileURLToPath } from "node:url"

/**
 * The sprites the build wrote: `<species>/<form>.png` and `unknown.png`. Serve it
 * at `/sprites/`, the base of every URL that `spriteUrl` gives.
 */
export const spritesDir = fileURLToPath(
  new URL("../dist/sprites", import.meta.url)
)
