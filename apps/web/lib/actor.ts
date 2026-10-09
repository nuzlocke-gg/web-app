import "server-only"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { cache } from "react"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

/** The signed-in Player's account, before or after the name step. */
export type Account = {
  id: string
  /** The Google given name, to prefill the Display Name. Never shown. */
  givenName: string | null
  /** Null until the Player chooses one at the first sign-in. */
  displayName: string | null
}

/**
 * Reads the signed-in Player's account from the session. Null when there is
 * no session or the account is a tombstone.
 */
export const readAccount = cache(async (): Promise<Account | null> => {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) return null

  const [row] = await db
    .select({
      id: users.id,
      givenName: users.name,
      displayName: users.displayName,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, userId))

  // A session can outlive its account for an instant: Delete account removes
  // the sessions in the same transaction that writes the tombstone.
  if (!row || row.deletedAt) return null

  return { id: row.id, givenName: row.givenName, displayName: row.displayName }
})

/**
 * Returns the signed-in Player's account, or redirects to the sign-in page.
 * Only the name step uses it; everything else calls {@link requireActor}.
 */
export const requireAccount = cache(async (): Promise<Account> => {
  const account = await readAccount()

  if (!account) redirect("/sign-in")

  return account
})

/**
 * Returns the id of the signed-in Player for a page or a command. Redirects to
 * the sign-in page without a live account, and to the name step while the
 * Player has no Display Name, so no screen or write skips that step.
 */
export const requireActor = cache(async (): Promise<string> => {
  const account = await requireAccount()

  if (account.displayName === null) redirect("/welcome")

  return account.id
})
