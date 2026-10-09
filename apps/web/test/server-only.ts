// Stands in for the `server-only` marker in Vitest and Playwright. A Node test
// process does not select the `react-server` export condition, so the real
// marker throws on import. Next builds still use the real one.
export {}
