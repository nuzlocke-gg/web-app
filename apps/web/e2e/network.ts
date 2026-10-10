import type { Page, Request, Route } from "@playwright/test"

/** Whether a request calls a Server Action, such as the Run action. */
export function isServerAction(request: Request): boolean {
  return (
    request.method() === "POST" &&
    request.headers()["next-action"] !== undefined
  )
}

/** Whether a request is a router refresh: an RSC fetch with no navigation. */
export function isRscFetch(request: Request): boolean {
  return request.method() === "GET" && request.headers()["rsc"] === "1"
}

/** The mutation id of the envelope a Server Action call carries. */
export function mutationIdOf(request: Request): string {
  const match = /"mutationId":"([0-9a-f-]{36})"/.exec(request.postData() ?? "")

  if (!match) throw new Error("The request carries no envelope")

  return match[1]!
}

/**
 * Hands every request that `matches` to `handle` until the returned function
 * stops it; every other request goes through.
 * @example
 * const stop = await intercept(page, isServerAction, commitAndLoseResponse)
 * await recordMudkip(page) // its response is lost
 * await stop() // later saves reach the server
 */
export async function intercept(
  page: Page,
  matches: (request: Request) => boolean,
  handle: (route: Route) => Promise<void>
): Promise<() => Promise<void>> {
  const handler = async (route: Route) => {
    if (matches(route.request())) await handle(route)
    else await route.fallback()
  }

  await page.route("**/*", handler)

  return () => page.unroute("**/*", handler)
}

/**
 * Lets the Server Action commit, then loses its response: the browser gets a
 * 500 instead, as when the connection drops on the way back.
 */
export async function commitAndLoseResponse(route: Route): Promise<void> {
  await route.fetch()
  await route.fulfill({ status: 500, body: "" })
}

/** Fails a request before it reaches the server. */
export async function failBeforeServer(route: Route): Promise<void> {
  await route.fulfill({ status: 500, body: "" })
}

/**
 * Sends a Server Action call with an action id the server does not know, as a
 * tab still on the build before a deploy does.
 */
export async function sendToUnknownAction(route: Route): Promise<void> {
  const headers = route.request().headers()

  await route.continue({
    headers: {
      ...headers,
      "next-action": "f".repeat(headers["next-action"]!.length),
    },
  })
}

/** Never answers a request, as a server that hangs. */
export async function hold(): Promise<void> {}
