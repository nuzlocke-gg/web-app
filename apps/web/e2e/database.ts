import { Pool } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"

import { configureNeon } from "../lib/db/neon-config.ts"
import { testDatabaseEnv } from "../test/database.ts"

configureNeon(testDatabaseEnv.DATABASE_WS_PROXY)

/** The test database, for flows that set up or change rows behind the app. */
export const testDb = drizzle({
  client: new Pool({ connectionString: testDatabaseEnv.DATABASE_URL }),
})
