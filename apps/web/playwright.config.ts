import { defineConfig, devices } from "@playwright/test"

import { testServerOrigin } from "./e2e/server.ts"
import { testDatabaseEnv } from "./test/database.ts"

const port = new URL(testServerOrigin).port

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./test/start-database.ts",
  use: {
    baseURL: testServerOrigin,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI tests the production build, as Next recommends: the dev server
    // compiles each route on its first visit, which on a CI runner can take
    // longer than a test waits. Locally, the dev server starts faster.
    command: process.env.CI
      ? `npm run build && npx next start --port ${port}`
      : `npx next dev --port ${port}`,
    url: `${testServerOrigin}/sign-in`,
    timeout: process.env.CI ? 600_000 : 120_000,
    // A server already on this port may use another database.
    reuseExistingServer: false,
    env: {
      ...testDatabaseEnv,
      AUTH_SECRET: "playwright-only-secret-not-used-anywhere-else",
      AUTH_TRUST_HOST: "true",
      // The flow never reaches Google: tests seed the session themselves.
      AUTH_GOOGLE_ID: "playwright",
      AUTH_GOOGLE_SECRET: "playwright",
    },
  },
})
