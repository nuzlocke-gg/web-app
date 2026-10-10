import { z } from "zod"

/** The most characters (Unicode code points) a cause of death may have. */
export const DEATH_CAUSE_MAX = 140

/** Why a cause of death is refused. An empty field means no cause instead. */
export type DeathCauseRefusal = "too-long"

/** What the screen says for each refusal. */
export const deathCauseRefusalMessages: Record<DeathCauseRefusal, string> = {
  "too-long": `Use ${DEATH_CAUSE_MAX} characters or fewer.`,
}

/**
 * Checks a cause of death as typed, after trimming. Counts code points, as
 * Postgres `char_length` does, so the screen, the server, and the database
 * CHECK agree.
 */
export function deathCauseRefusal(trimmed: string): DeathCauseRefusal | null {
  return [...trimmed].length > DEATH_CAUSE_MAX ? "too-long" : null
}

/**
 * A cause of death in parsed form: already trimmed, 1 to 140 code points.
 * The screen trims before it sends and sends null when the field is empty.
 */
export const deathCause = z
  .string()
  .refine(
    (cause) =>
      cause === cause.trim() &&
      cause !== "" &&
      deathCauseRefusal(cause) === null,
    "A cause of death is trimmed and has 1 to 140 characters."
  )

/**
 * The level a Pokémon died at. Its highest value is the Map's `maxLevel`,
 * which the death Drawer and the server check; the shared `check` has no Map.
 */
export const deathLevel = z.int().positive()

/**
 * A death level as typed in a number field: null for an empty field, else a
 * whole number from 1 to the Map's highest level, or the problem with it.
 * @param field The field's value, trimmed, and its `validity.badInput`, which
 *   is true when the browser cannot read the text as a number (its value is
 *   then empty).
 */
export function typedDeathLevel(
  field: { value: string; badInput: boolean },
  maxLevel: number
): { level: number | null; problem: string | null } {
  const problem = `Use a level from 1 to ${maxLevel}.`

  if (field.badInput) return { level: null, problem }

  if (field.value === "") return { level: null, problem: null }

  const level = Number(field.value)

  if (!/^\d+$/.test(field.value) || level < 1 || level > maxLevel) {
    return { level: null, problem }
  }

  return { level, problem: null }
}
