import { eq } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { afterEach, describe, expect, test, vi } from "vitest"

import { db } from "@/lib/db"
import { accounts, sessions, users } from "@/lib/db/schema"

import { signInDevPlayer, signOutDevPlayer } from "./dev-auth"

function useDevEmail() {
  const email = `${randomUUID()}@example.test`
  vi.stubEnv("DEV_AUTH_EMAIL", email)

  return email
}

async function sessionsOf(email: string) {
  return db
    .select({ token: sessions.sessionToken })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(users.email, email))
}

describe("dev sign-in", () => {
  afterEach(() => vi.unstubAllEnvs())

  test("makes the dev Player once, with no Display Name, and starts a session", async () => {
    const email = useDevEmail()

    const first = await signInDevPlayer("localhost:3000")
    const second = await signInDevPlayer("localhost:3000")

    const players = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.email, email))
    expect(players).toEqual([{ displayName: null }])
    await expect(sessionsOf(email)).resolves.toEqual(
      expect.arrayContaining([
        { token: first!.value },
        { token: second!.value },
      ])
    )
  })

  test("refuses a remote host and makes nothing", async () => {
    const email = useDevEmail()

    await expect(signInDevPlayer("nuzlocke.gg")).resolves.toBeNull()
    await expect(sessionsOf(email)).resolves.toEqual([])
  })

  test("refuses an account that signs in with Google", async () => {
    const email = useDevEmail()
    const [player] = await db
      .insert(users)
      .values({ email, name: "Ash", displayName: "Ash" })
      .returning({ id: users.id })
    await db.insert(accounts).values({
      userId: player!.id,
      type: "oidc",
      provider: "google",
      providerAccountId: randomUUID(),
    })

    await expect(signInDevPlayer("localhost:3000")).resolves.toBeNull()
    await expect(signOutDevPlayer("localhost:3000")).resolves.toBeNull()
    await expect(sessionsOf(email)).resolves.toEqual([])
  })

  test("sign-out ends every session of the dev Player", async () => {
    const email = useDevEmail()
    await signInDevPlayer("localhost:3000")
    await signInDevPlayer("localhost:3000")

    await expect(signOutDevPlayer("localhost:3000")).resolves.toBe(
      "authjs.session-token"
    )
    await expect(sessionsOf(email)).resolves.toEqual([])
  })
})
