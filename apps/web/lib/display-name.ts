import { err, ok, type Result } from "serializable-result"

/** The most characters (Unicode code points) a Display Name may have. */
export const DISPLAY_NAME_MAX = 30

/** Why a Display Name is refused. */
export type DisplayNameRefusal = "empty" | "too-long"

/** What the screen says for each refusal. */
export const displayNameRefusalMessages: Record<DisplayNameRefusal, string> = {
  empty: "Enter a name.",
  "too-long": `Use ${DISPLAY_NAME_MAX} characters or fewer.`,
}

/**
 * Reads a Display Name as a player typed it: trims it, then accepts 1 to 30
 * characters of any Unicode.
 *
 * Counts code points, as Postgres `char_length` does, so the screen, the
 * server, and the database CHECK agree on every name.
 */
export function parseDisplayName(
  raw: unknown
): Result<string, DisplayNameRefusal> {
  const value = typeof raw === "string" ? raw.trim() : ""
  const length = [...value].length

  if (length === 0) return err("empty")
  if (length > DISPLAY_NAME_MAX) return err("too-long")

  return ok(value)
}
