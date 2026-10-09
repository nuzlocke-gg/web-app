import { NextResponse } from "next/server"

import { signInDevPlayer } from "@/lib/dev-auth"

/**
 * Signs the caller in as the dev Player, without Google. Local development
 * only (see `lib/dev-auth.ts`); everywhere else it answers 404. Sets the
 * session cookie, and returns it in the body for a caller outside a browser.
 *
 * @example
 * // In a browser on localhost:
 * await fetch("/api/dev/sign-in", { method: "POST" })
 *
 * @example
 * // From a shell:
 * // curl -s -X POST http://localhost:3000/api/dev/sign-in
 * // → { "cookieName": "authjs.session-token", "sessionToken": "…" }
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookie = await signInDevPlayer(request.headers.get("host"))

  if (!cookie) return new NextResponse("Not Found", { status: 404 })

  const response = NextResponse.json({
    cookieName: cookie.name,
    sessionToken: cookie.value,
  })
  response.cookies.set(cookie.name, cookie.value, cookie.options)

  return response
}
