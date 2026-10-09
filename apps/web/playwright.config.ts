import { defineConfig, devices } from "@playwright/test"

import { testServerOrigin } from "./e2e/server.ts"
import { testDatabaseEnv } from "./test/database.ts"

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./test/start-database.ts",
  use: {
    baseURL: testServerOrigin,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev --port ${new URL(testServerOrigin).port}`,
    url: `${testServerOrigin}/sign-in`,
    timeout: 120_000,
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
