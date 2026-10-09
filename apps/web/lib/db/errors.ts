/**
 * Returns the Postgres SQLSTATE of a failed query, such as `23505` for a
 * unique violation, or undefined when the error did not come from Postgres.
 *
 * Drizzle wraps the driver's error, so the code sits somewhere down the
 * `cause` chain; this reads every level and stops if the chain loops.
 */
export function postgresErrorCode(error: unknown): string | undefined {
  const seen = new Set<unknown>()
  let current = error

  while (
    typeof current === "object" &&
    current !== null &&
    !seen.has(current)
  ) {
    seen.add(current)

    const code = (current as { code?: unknown }).code

    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code

    current = (current as { cause?: unknown }).cause
  }

  return undefined
}
