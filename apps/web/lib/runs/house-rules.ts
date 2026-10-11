import { z } from "zod"

/** The most characters (Unicode code points) the House rules may have. */
export const HOUSE_RULES_MAX = 2000

/** Why House rules are refused. */
export type HouseRulesRefusal = "too-long"

/** What the screen says for each refusal. */
export const houseRulesRefusalMessages: Record<HouseRulesRefusal, string> = {
  "too-long": `Use ${HOUSE_RULES_MAX.toLocaleString("en-US")} characters or fewer.`,
}

/**
 * Checks House rules as typed. Counts code points, as Postgres `char_length`
 * does, so the screen, the server, and the database CHECK agree.
 */
export function houseRulesRefusal(text: string): HouseRulesRefusal | null {
  return [...text].length > HOUSE_RULES_MAX ? "too-long" : null
}

/**
 * The House rules to save from the text of the field: the text as typed, line
 * breaks and indentation kept, or null when it is blank.
 */
export function houseRulesOf(text: string): string | null {
  return text.trim() === "" ? null : text
}

/**
 * House rules in parsed form: plain text that is not blank, up to 2,000 code
 * points, or null for none. The screen sends {@link houseRulesOf} the field.
 */
export const houseRules = z
  .string()
  .refine(
    (text) => text.trim() !== "" && houseRulesRefusal(text) === null,
    "House rules are not blank and have at most 2,000 characters."
  )
  .nullable()
