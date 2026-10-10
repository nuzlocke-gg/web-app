import { z } from "zod"

/**
 * The most characters (Unicode code points) a nickname may have: the longest
 * nickname any main-series game allows.
 */
export const NICKNAME_MAX = 12

/** Why a nickname is refused. An empty field means no nickname instead. */
export type NicknameRefusal = "too-long"

/** What the screen says for each refusal. */
export const nicknameRefusalMessages: Record<NicknameRefusal, string> = {
  "too-long": `Use ${NICKNAME_MAX} characters or fewer.`,
}

/**
 * Checks a nickname as typed, after trimming. Counts code points, as Postgres
 * `char_length` does, so the screen, the server, and the database CHECK agree.
 */
export function nicknameRefusal(trimmed: string): NicknameRefusal | null {
  return [...trimmed].length > NICKNAME_MAX ? "too-long" : null
}

/**
 * A nickname in parsed form: already trimmed, 1 to 12 code points. The schema
 * refuses surrounding spaces instead of trimming them, because headcanon
 * admits only arguments that parse to themselves; the screen trims before it
 * sends and sends no nickname when the field is empty.
 */
export const nickname = z
  .string()
  .refine(
    (name) =>
      name === name.trim() && name !== "" && nicknameRefusal(name) === null,
    "A nickname is trimmed and has 1 to 12 characters."
  )
