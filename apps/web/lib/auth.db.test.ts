import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { randomBytes, randomUUID } from "node:crypto"
import type { GoogleProfile } from "next-auth/providers/google"
import { describe, expect, test } from "vitest"

import { db } from "@/lib/db"
import { accounts, sessions, users } from "@/lib/db/schema"

import { googleProfileToUser } from "./auth"

function googleProfile(): GoogleProfile {
  return {
    sub: randomUUID(),
    email: `${randomUUID()}@example.test`,
    email_verified: true,
    name: "Ash Ketchum",
    given_name: "Ash",
    family_name: "Ketchum",
    picture: "https://lh3.googleusercontent.com/a/photo",
    aud: "",
    azp: "",
    exp: 0,
    iat: 0,
    iss: "https://accounts.google.com",
  }
}

describe("googleProfileToUser", () => {
  test("keeps the given name and drops the surname and the picture", () => {
    const profile = googleProfile()

    expect(googleProfileToUser(profile)).toEqual({
      id: profile.sub,
      email: profile.email,
      name: "Ash",
      image: null,
    })
  })
})

describe("the Auth.js adapter on our tables", () => {
  test("creates a user, links Google, and reads the session back", async () => {
    const adapter = DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
    })
    const { id: googleId, ...profileUser } =
      googleProfileToUser(googleProfile())
    const user = await adapter.createUser!({
      ...profileUser,
      id: randomUUID(),
      email: profileUser.email,
      emailVerified: null,
    })

    // What core passes when the provider's `account()` returns {}.
    await adapter.linkAccount!({
      userId: user.id,
      type: "oidc",
      provider: "google",
      providerAccountId: googleId,
    })

    const sessionToken = randomBytes(32).toString("hex")
    await adapter.createSession!({
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 60_000),
    })

    const found = await adapter.getSessionAndUser!(sessionToken)
    const byAccount = await adapter.getUserByAccount!({
      provider: "google",
      providerAccountId: googleId,
    })

    expect(found?.user).toMatchObject({ id: user.id, name: "Ash", image: null })
    expect(byAccount?.id).toBe(user.id)
  })
})
