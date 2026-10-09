import "server-only"

import { Pool } from "@neondatabase/serverless"
import { attachDatabasePool } from "@vercel/functions"
import { drizzle } from "drizzle-orm/neon-serverless"

import { configureNeon } from "./neon-config"
import * as schema from "./schema"

configureNeon(process.env.DATABASE_WS_PROXY)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2_000,
})

// Lets Fluid Compute close idle connections before it suspends the function.
attachDatabasePool(pool)

/** The app's one database client: Drizzle over the Neon WebSocket `Pool`. */
export const db = drizzle({ client: pool, schema })
