import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

import { testDatabaseEnv } from "./test/database.ts"

const shared = {
  extends: true as const,
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/server-only.ts", import.meta.url)
      ),
    },
  },
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // next-auth and headcanon import `next/server` or `next/cache` with no
    // extension, which Node's ESM loader refuses; Vite resolves them when the
    // package is inlined.
    server: { deps: { inline: ["next-auth", "headcanon"] } },
    projects: [
      {
        ...shared,
        test: {
          name: "unit",
          environment: "jsdom",
          // A screen test that renders the full Species grid takes 3 to 7 s
          // on the CI runner while the other files run beside it, above the
          // 5 s default.
          testTimeout: 15_000,
          include: ["**/*.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "**/*.db.test.ts", "e2e/**"],
        },
      },
      {
        ...shared,
        test: {
          name: "db",
          environment: "node",
          include: ["**/*.db.test.ts"],
          exclude: ["**/node_modules/**"],
          globalSetup: ["./test/start-database.ts"],
          env: testDatabaseEnv,
        },
      },
    ],
  },
})
