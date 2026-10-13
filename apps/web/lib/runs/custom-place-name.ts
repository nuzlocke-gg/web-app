import { z } from "zod"

import type { RunState } from "./state"

/** The most characters (Unicode code points) a Custom Place name may have. */
export const CUSTOM_PLACE_NAME_MAX = 40

/**
 * Whether a trimmed name fits {@link CUSTOM_PLACE_NAME_MAX}. Counts code
 * points, as Postgres `char_length` does, so the screen, the server, and the
 * database CHECK agree.
 */
export function customPlaceNameFits(trimmed: string): boolean {
  return [...trimmed].length <= CUSTOM_PLACE_NAME_MAX
}

/**
 * A Custom Place name in parsed form: already trimmed, 1 to 40 code points.
 * The schema refuses surrounding spaces instead of trimming them, because
 * headcanon admits only arguments that parse to themselves; the screen trims
 * before it sends.
 */
export const customPlaceName = z
  .string()
  .refine(
    (name) => name === name.trim() && name !== "" && customPlaceNameFits(name),
    "A custom location name is trimmed and has 1 to 40 characters."
  )

/**
 * Whether two location names are the same name: equal once trimmed, in any
 * letter case. The database's `UNIQUE(run_id, lower(name))` is the authority.
 */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Whether another Custom Place of the Run already has this name.
 * @param exceptId The Custom Place being renamed, which may keep its own name
 * in another letter case.
 */
export function customPlaceNameTaken(
  run: RunState,
  name: string,
  exceptId?: string
): boolean {
  return run.customPlaces.some(
    (custom) => custom.id !== exceptId && sameName(custom.name, name)
  )
}
