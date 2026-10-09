import { NextResponse } from "next/server"

import { signOutDevPlayer } from "@/lib/dev-auth"

/**
 * Ends every session of the dev Player and clears the cookie. Local
 * development only (see `lib/dev-auth.ts`); everywhere else it answers 404.
 *
 * @example
 * await fetch("/api/dev/sign-out", { method: "POST" })
 */
export async function POST(request: Request): Promise<NextResponse> {
  const cookieName = await signOutDevPlayer(request.headers.get("host"))

  if (!cookieName) return new NextResponse("Not Found", { status: 404 })

  const response = NextResponse.json({ ok: true })
  response.cookies.delete(cookieName)

  return response
}
