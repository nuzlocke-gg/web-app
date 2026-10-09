import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { testDatabaseEnv } from "./database.ts"

const appDir = fileURLToPath(new URL("..", import.meta.url))

/**
 * Starts the local test database (a no-op when it is already up) and applies
 * the committed migrations, the same script a deployment runs.
 */
export function startTestDatabase(): void {
  execFileSync(
    "docker",
    ["compose", "-f", "compose.test.yaml", "up", "--detach", "--wait"],
    { cwd: appDir, stdio: "inherit" }
  )

  execFileSync("node", ["scripts/migrate.ts"], {
    cwd: appDir,
    stdio: "inherit",
    env: { ...process.env, ...testDatabaseEnv },
  })
}

export default startTestDatabase
