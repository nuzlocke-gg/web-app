/**
 * The environment that points the app at the local test database from
 * compose.test.yaml. Vitest and Playwright both use it.
 */
export const testDatabaseEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:54329/nuzlocke_test",
  DATABASE_WS_PROXY: "localhost:54330",
}
