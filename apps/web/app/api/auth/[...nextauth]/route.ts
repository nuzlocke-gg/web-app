import { NextRequest } from "next/server"

import { handlers } from "@/lib/auth"

// `next dev` gives a route handler its own host (localhost:3000) even behind a
// proxy such as `tailscale serve`, while Auth.js's Server Actions read the
// forwarded host. Sign-in through the proxy would then start on the proxy's
// host and come back to localhost. A Vercel deployment already gets its real
// URL, so production builds are left as they are.
function withForwardedHost(request: NextRequest): NextRequest {
  const forwardedHost = request.headers.get("x-forwarded-host")

  if (process.env.NODE_ENV === "production" || !forwardedHost) return request

  const { protocol, pathname, search } = request.nextUrl
  const url = new URL(pathname + search, `${protocol}//${forwardedHost}`)

  return new NextRequest(url, request)
}

export const GET = (request: NextRequest) =>
  handlers.GET(withForwardedHost(request))

export const POST = (request: NextRequest) =>
  handlers.POST(withForwardedHost(request))
