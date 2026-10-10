import { z } from "zod"

/** A Species and Form pair in the arguments of a change. */
export const formRefArgs = z.object({
  species: z.string().min(1),
  form: z.string().min(1),
})
