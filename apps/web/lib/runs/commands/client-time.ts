import "server-only"

import { sql } from "drizzle-orm"

/**
 * The SQL value of a time of entry from the client's clock, in epoch
 * milliseconds: never later than the server's clock, and in whole
 * milliseconds, as the state keeps it.
 */
export function clientTime(epochMilliseconds: number) {
  return sql`least(
    timestamptz 'epoch' + ${epochMilliseconds}::float8 * interval '1 millisecond',
    date_trunc('milliseconds', now())
  )`
}
