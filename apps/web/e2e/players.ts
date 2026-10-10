import { DrizzleAdapter } from "@auth/drizzle-adapter"
import type { BrowserContext } from "@playwright/test"
import { eq } from "drizzle-orm"
import { randomBytes, randomUUID } from "node:crypto"

import { accounts, sessions, users } from "../lib/db/schema.ts"
import { testDb as db } from "./database.ts"
import { testServerOrigin } from "./server.ts"

// Stands in for Google: makes the user, the linked account, and a session
// through the real Auth.js adapter, the way a first sign-in would. It lives
// only in the tests, so nothing of it ships in the app.

const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
})

/**
 * Signs a new Google user in, as Auth.js does at the first sign-in. Returns
 * the user's id and Google email.
 */
export async function signInNewPlayer(
  context: BrowserContext,
  givenName: string
): Promise<{ id: string; email: string }> {
  const user = await adapter.createUser!({
    id: randomUUID(),
    email: `${randomUUID()}@example.test`,
    emailVerified: null,
    name: givenName,
    image: null,
  })

  await adapter.linkAccount!({
    userId: user.id,
    type: "oidc",
    provider: "google",
    providerAccountId: randomUUID(),
  })

  await startSession(context, user.id)

  return { id: user.id, email: user.email }
}

/**
 * Signs in a Player who chose their Display Name at an earlier sign-in.
 * Returns their Google email.
 */
export async function signInNamedPlayer(
  context: BrowserContext,
  displayName: string
): Promise<string> {
  const { email } = await signInNamed(context, displayName)

  return email
}

/**
 * Signs in a Player who chose their Display Name at an earlier sign-in.
 * Returns their id and Google email.
 */
export async function signInNamed(
  context: BrowserContext,
  displayName: string
): Promise<{ id: string; email: string }> {
  const player = await signInNewPlayer(context, displayName)

  await db.update(users).set({ displayName }).where(eq(users.id, player.id))

  return player
}

/**
 * Gives a tombstoned account a session that survived its deletion, the race
 * that Delete account can leave for an instant.
 */
export async function signInTombstone(context: BrowserContext): Promise<void> {
  const [row] = await db
    .insert(users)
    .values({ deletedAt: new Date() })
    .returning({ id: users.id })

  await startSession(context, row!.id)
}

/**
 * Starts a session for an existing Player in `context`, in place of whoever
 * was signed in there, as a sign-in in another tab of the same browser would.
 */
export async function startSession(context: BrowserContext, userId: string) {
  const sessionToken = randomBytes(32).toString("hex")

  await adapter.createSession!({
    sessionToken,
    userId,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  })

  // The cookie name Auth.js uses on plain http.
  await context.addCookies([
    {
      name: "authjs.session-token",
      value: sessionToken,
      url: testServerOrigin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
}
