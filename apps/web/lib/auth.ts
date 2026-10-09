import { DrizzleAdapter } from "@auth/drizzle-adapter"
import NextAuth, { type NextAuthResult } from "next-auth"
import Google, { type GoogleProfile } from "next-auth/providers/google"

import { db } from "@/lib/db"
import { accounts, sessions, users } from "@/lib/db/schema"

/**
 * Maps a Google profile to the user row Auth.js creates at the first sign-in.
 * Keeps the given name only, to prefill the Display Name, and never the
 * surname or the picture.
 */
export function googleProfileToUser(profile: GoogleProfile) {
  return {
    id: profile.sub,
    email: profile.email,
    name: profile.given_name ?? null,
    image: null,
  }
}

const nextAuth = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
  }),
  session: { strategy: "database" },
  providers: [
    Google({
      profile: googleProfileToUser,
      // The app never calls Google, so it stores none of Google's tokens.
      account: () => ({}),
    }),
  ],
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    session: ({ session, user }) => ({ ...session, user: { id: user.id } }),
  },
})

// Annotated, because the inferred types name next-auth internals that a
// declaration file cannot reference.

/** The Auth.js route handlers, exported by `app/api/auth/[...nextauth]`. */
export const handlers: NextAuthResult["handlers"] = nextAuth.handlers

/**
 * Reads the database session from the request cookies. Its `user` holds only
 * the Player's `id`. Pages and actions call `requireActor` instead.
 */
export const auth: NextAuthResult["auth"] = nextAuth.auth

/**
 * Starts sign-in from a Server Action. Navigates by throwing a redirect, so
 * call it outside `try`.
 *
 * @example
 * await signIn("google", { redirectTo: "/" })
 */
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn

/**
 * Ends the session from a Server Action: deletes the session row and its
 * cookie. Navigates by throwing a redirect, so call it outside `try`.
 *
 * @example
 * await signOut({ redirectTo: "/sign-in" })
 */
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut
