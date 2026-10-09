import { z } from "zod"

/** The most characters (Unicode code points) a Run name may have. */
export const RUN_NAME_MAX = 60

/** Why a Run name is refused. */
export type RunNameRefusal = "empty" | "too-long"

/** What the screen says for each refusal. */
export const runNameRefusalMessages: Record<RunNameRefusal, string> = {
  empty: "Enter a name.",
  "too-long": `Use ${RUN_NAME_MAX} characters or fewer.`,
}

/**
 * Checks a Run name as typed, after trimming. Counts code points, as Postgres
 * `char_length` does, so the screen, the server, and the database CHECK agree.
 */
export function runNameRefusal(trimmed: string): RunNameRefusal | null {
  const length = [...trimmed].length

  if (length === 0) return "empty"
  if (length > RUN_NAME_MAX) return "too-long"

  return null
}

/**
 * A Run name in parsed form: already trimmed, 1 to 60 code points. The schema
 * refuses a name with surrounding spaces instead of trimming it, because
 * headcanon admits only arguments that parse to themselves; the form trims
 * before it sends.
 */
export const runName = z
  .string()
  .refine(
    (name) => name === name.trim() && runNameRefusal(name) === null,
    "A Run name is trimmed and has 1 to 60 characters."
  )
