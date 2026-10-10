import type { FormRef } from "@workspace/game-data"
import { z } from "zod"

/** A Species and Form pair in the arguments of a change. */
export const formRefArgs = z.object({
  species: z.string().min(1),
  form: z.string().min(1),
})

/** Whether two Species and Form pairs, either absent, are the same. */
export function sameForm(a: FormRef | null, b: FormRef | null): boolean {
  return a?.species === b?.species && a?.form === b?.form
}
