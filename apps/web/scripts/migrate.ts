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

const pool = new Pool({ connectionString })

try {
  await migrate(drizzle({ client: pool }), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  })
} finally {
  await pool.end()
}
