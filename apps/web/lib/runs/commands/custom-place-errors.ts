import "server-only"

import { matchesPostgresError } from "headcanon/drizzle"

/**
 * Whether a database error is the unique violation of one Custom Place name
 * per Run, in any letter case: a race that passed the change's check.
 */
export function isCustomPlaceNameTaken(error: unknown): boolean {
  return matchesPostgresError(error, {
    code: "23505",
    constraint: "custom_places_run_name_key",
  })
}
