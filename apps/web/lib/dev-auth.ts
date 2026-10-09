import "server-only"

import { eq } from "drizzle-orm"
import { randomBytes } from "node:crypto"

import { db } from "@/lib/db"
import { accounts, sessions, users } from "@/lib/db/schema"

// Dev sign-in lets an agent or a local script sign in without Google. It
// signs in as one account only, the Player with the email in DEV_AUTH_EMAIL,
// and it is off unless all three guards pass: not a production build,
// DEV_AUTH_EMAIL set, and a localhost Host header. A preview or production
// deployment is a production build, so it never has dev sign-in.
//
// The Host header is the client's word, and `next dev` listens on every
// interface, so a machine on the same network can pass the host guard. Dev
// sign-in therefore refuses an account linked to Google: the most it can give
// is a session as a throwaway dev Player, never as a real person.

/** The cookie Auth.js reads its database session from on plain http. */
const SESSION_COOKIE_NAME = "authjs.session-token"

/** The idle lifetime Auth.js gives a database session. */
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

type DevAuthEnv = { NODE_ENV?: string; DEV_AUTH_EMAIL?: string }

type DevAuthBoundary =
  { open: true; email: string } | { open: false; reason: string | null }

/** A session cookie for `cookies().set` or `NextResponse.cookies.set`. */
export type DevSessionCookie = {
  name: typeof SESSION_COOKIE_NAME
  value: string
  options: {
    httpOnly: true
    sameSite: "lax"
    path: "/"
    secure: false
    maxAge: number
  }
}

function checkDevAuthBoundary(
  host: string | null,
  env: DevAuthEnv
): DevAuthBoundary {
  // No reason, so a production log never mentions dev sign-in.
  if (env.NODE_ENV === "production") return { open: false, reason: null }

  if (!env.DEV_AUTH_EMAIL) {
    return {
      open: false,
      reason: "DEV_AUTH_EMAIL is not set in apps/web/.env.local",
    }
  }

  if (!isLocalhost(host)) {
    return { open: false, reason: `the host ${host ?? "(none)"} is not local` }
  }

  return { open: true, email: env.DEV_AUTH_EMAIL }
}

/** Accepts localhost, 127.0.0.1, and [::1] on any port, and nothing else. */
function isLocalhost(host: string | null): boolean {
  if (!host) return false

  const ipv6 = host.match(/^\[(.+)\](?::\d+)?$/)
  const hostname = ipv6 ? ipv6[1] : host.split(":")[0]

  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  )
}

/** The dev Player's email when dev sign-in is on; else logs why and is null. */
function devAuthEmailOrLogRefusal(
  route: string,
  host: string | null
): string | null {
  const boundary = checkDevAuthBoundary(host, process.env)

  if (boundary.open) return boundary.email

  if (boundary.reason) console.warn(`[${route}] refused: ${boundary.reason}`)

  return null
}

type DevPlayer = { id: string; linkedToGoogle: boolean }

async function findDevPlayer(email: string): Promise<DevPlayer | undefined> {
  const [player] = await db
    .select({ id: users.id, googleAccount: accounts.providerAccountId })
    .from(users)
    .leftJoin(accounts, eq(accounts.userId, users.id))
    .where(eq(users.email, email))

  return (
    player && { id: player.id, linkedToGoogle: player.googleAccount !== null }
  )
}

function logGoogleAccountRefusal(route: string): void {
  console.warn(
    `[${route}] refused: DEV_AUTH_EMAIL belongs to a Google account; use an email nobody signs in with`
  )
}

/**
 * Whether dev sign-in is on for a request with this Host header. The sign-in
 * page shows its button only when it is.
 */
export function isDevAuthAvailable(
  host: string | null,
  env: DevAuthEnv = process.env
): boolean {
  return checkDevAuthBoundary(host, env).open
}

/**
 * Starts a database session for the dev Player and returns its cookie, or
 * null when dev sign-in is off or the account of DEV_AUTH_EMAIL signs in with
 * Google. Makes the dev Player on first use, with no Display Name, so the
 * first sign-in goes through the name step.
 */
export async function signInDevPlayer(
  host: string | null
): Promise<DevSessionCookie | null> {
  const email = devAuthEmailOrLogRefusal("dev sign-in", host)

  if (!email) return null

  await db.insert(users).values({ email, name: "Dev" }).onConflictDoNothing()

  const player = (await findDevPlayer(email))!

  if (player.linkedToGoogle) {
    logGoogleAccountRefusal("dev sign-in")

    return null
  }

  const sessionToken = randomBytes(32).toString("hex")

  await db.insert(sessions).values({
    sessionToken,
    userId: player.id,
    expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  })

  return {
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  }
}

/**
 * Ends every session of the dev Player and returns the cookie name to clear,
 * or null when dev sign-in is off or the account of DEV_AUTH_EMAIL signs in
 * with Google. Succeeds with no session, or no dev Player, too.
 */
export async function signOutDevPlayer(
  host: string | null
): Promise<typeof SESSION_COOKIE_NAME | null> {
  const email = devAuthEmailOrLogRefusal("dev sign-out", host)

  if (!email) return null

  const player = await findDevPlayer(email)

  if (player?.linkedToGoogle) {
    logGoogleAccountRefusal("dev sign-out")

    return null
  }

  if (player) await db.delete(sessions).where(eq(sessions.userId, player.id))

  return SESSION_COOKIE_NAME
}
