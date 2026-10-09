import { defineConfig } from "drizzle-kit"

// Used only to generate migrations. They run through scripts/migrate.ts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
})
