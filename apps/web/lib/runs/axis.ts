import { defineAxis } from "headcanon"
import { z } from "zod"

const runIdSchema = z.uuid()

/**
 * The headcanon axis family of a Run: `runAxis.of(runId)` is `run/<runId>`,
 * whose revision is the Run row's `revision`. The loader, every writer, and
 * the token endpoint use it; nothing builds the axis by hand.
 */
export const runAxis = defineAxis("run", runIdSchema)

/** Whether a value from a URL is a Run id the axis accepts. */
export function isRunId(value: string): boolean {
  return runIdSchema.safeParse(value).success
}
