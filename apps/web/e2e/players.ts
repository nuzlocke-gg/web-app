import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { Pool } from "@neondatabase/serverless"
import type { BrowserContext } from "@playwright/test"
import { drizzle } from "drizzle-orm/neon-serverless"
import { randomBytes, randomUUID } from "node:crypto"

import { configureNeon } from "../lib/db/neon-config.ts"
import { accounts, sessions, users } from "../lib/db/schema.ts"
import { testDatabaseEnv } from "../test/database.ts"
import { testServerOrigin } from "./server.ts"

// Stands in for Google: makes the user, the linked account, and a session
// through the real Auth.js adapter, the way a first sign-in would. It lives
// only in the tests, so nothing of it ships in the app.

configureNeon(testDatabaseEnv.DATABASE_WS_PROXY)

const db = drizzle({
  client: new Pool({ connectionString: testDatabaseEnv.DATABASE_URL }),
})
const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
})

/** Signs a new Google user in, as Auth.js does at the first sign-in. */
export async function signInNewPlayer(
  context: BrowserContext,
  givenName: string
): Promise<void> {
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

async function startSession(context: BrowserContext, userId: string) {
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
