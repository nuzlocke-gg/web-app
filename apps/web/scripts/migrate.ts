// Applies the committed migrations in drizzle/ to the database named by
// DATABASE_URL_UNPOOLED or DATABASE_URL. Vercel runs it before each build, so
// a deployment is promoted only after its migrations succeed.
import { Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"
import { migrate } from "drizzle-orm/neon-serverless/migrator"
import { fileURLToPath } from "node:url"

import { configureNeon } from "../lib/db/neon-config.ts"

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("Set DATABASE_URL to run the migrations.")
}

configureNeon(process.env.DATABASE_WS_PROXY)

// Each Neon branch has its own endpoint, so the build log shows which branch
// a deployment migrated. Only the endpoint id is logged: Vercel redacts the
// full host, because it is also the value of an environment variable.
const endpointId = new URL(connectionString).hostname.split(".")[0]

console.log(`Migrating Neon endpoint ${endpointId}`)

const pool = new Pool({ connectionString })

try {
  await migrate(drizzle({ client: pool }), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  })
} finally {
  await pool.end()
}
