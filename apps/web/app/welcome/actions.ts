"use server"

import { redirect } from "next/navigation"

import { requireAccount } from "@/lib/actor"
import { type DisplayNameRefusal, parseDisplayName } from "@/lib/display-name"
import { setDisplayName } from "@/lib/players"

/** What the name step shows after a refused submit. */
export type ChooseDisplayNameState = { refusal: DisplayNameRefusal | null }

/**
 * Saves the Display Name the Player chose at the first sign-in, then goes
 * home. Returns the refusal when the name breaks the rule.
 */
export async function chooseDisplayName(
  _previous: ChooseDisplayNameState,
  form: FormData
): Promise<ChooseDisplayNameState> {
  const account = await requireAccount()
  const name = parseDisplayName(form.get("displayName"))

  if (!name.ok) return { refusal: name.error }

  await setDisplayName(account.id, name.value)

  redirect("/")
}
