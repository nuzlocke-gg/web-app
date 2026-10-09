"use server"

import { refresh } from "next/cache"

import { requireActor } from "@/lib/actor"
import { signOut } from "@/lib/auth"
import { type DisplayNameRefusal, parseDisplayName } from "@/lib/display-name"
import { setDisplayName } from "@/lib/players"

/** What Settings shows after a Display Name submit. */
export type ChangeDisplayNameState = {
  refusal: DisplayNameRefusal | null
  /** The name as saved, trimmed; null until a submit saves one. */
  savedName: string | null
}

/**
 * Saves the signed-in Player's new Display Name. Returns the refusal when the
 * name breaks the rule, else the trimmed name as saved.
 */
export async function changeDisplayName(
  _previous: ChangeDisplayNameState,
  form: FormData
): Promise<ChangeDisplayNameState> {
  const playerId = await requireActor()
  const name = parseDisplayName(form.get("displayName"))

  if (!name.ok) return { refusal: name.error, savedName: null }

  // An account action: no Run lock and no signal, because every screen reads
  // the name from the account.
  await setDisplayName(playerId, name.value)

  refresh()

  return { refusal: null, savedName: name.value }
}

/** Ends the session and goes to the sign-in page. */
export async function signOutPlayer(): Promise<void> {
  await signOut({ redirectTo: "/sign-in" })
}
